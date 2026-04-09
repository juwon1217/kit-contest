from config import supabase
from ai_engine import get_chat_model
from langchain_core.messages import HumanMessage, SystemMessage


def _get_student_interactions(class_id: str, student_id: str) -> list[dict]:
    """학생의 수업 중 인터랙션(질문) 목록 반환"""
    res = supabase.table("interactions")\
        .select("page_number, interaction_type, question_content, ai_response, created_at")\
        .eq("class_id", class_id)\
        .eq("student_id", student_id)\
        .order("created_at")\
        .execute()
    return res.data or []


def _get_student_chat_history(class_id: str, student_id: str) -> list[dict]:
    """학생의 채팅 세션 및 메시지 내역 반환"""
    sessions_res = supabase.table("chat_sessions")\
        .select("id, context_type, context_source")\
        .eq("class_id", class_id)\
        .eq("student_id", student_id)\
        .execute()

    chat_logs = []
    for session in (sessions_res.data or []):
        msgs_res = supabase.table("chat_messages")\
            .select("role, content")\
            .eq("session_id", session["id"])\
            .order("created_at")\
            .execute()
        if msgs_res.data:
            chat_logs.append({
                "context_type": session.get("context_type", "follow_up"),
                "messages": msgs_res.data
            })
    return chat_logs


def _generate_ai_student_summary(
    student_name: str,
    interactions: list[dict],
    chat_logs: list[dict]
) -> str:
    """Gemini AI를 이용해 학생 개인 학습 요약 보고서 생성"""
    # 인터랙션 요약 텍스트 구성
    interaction_text = ""
    if interactions:
        page_groups: dict[int, list[str]] = {}
        for intr in interactions:
            p = intr.get("page_number", 0)
            q = intr.get("question_content", "")
            a = intr.get("ai_response", "")
            if p not in page_groups:
                page_groups[p] = []
            if q:
                page_groups[p].append(f"  질문: {q}")
            if a:
                page_groups[p].append(f"  AI 답변: {a[:200]}...")

        for page, entries in sorted(page_groups.items()):
            interaction_text += f"\n[{page}페이지]\n" + "\n".join(entries[:4]) + "\n"

    # 채팅 내역 요약 텍스트
    chat_text = ""
    if chat_logs:
        for log in chat_logs[:5]:
            msgs = log.get("messages", [])
            for msg in msgs[:6]:
                role_label = "학생" if msg["role"] == "user" else "AI"
                chat_text += f"  {role_label}: {msg['content'][:200]}\n"
            chat_text += "\n"

    if not interaction_text and not chat_text:
        return "이번 수업에서 AI와의 상호작용 내역이 없습니다."

    prompt = f"""당신은 교육 데이터 분석 전문가입니다.
아래는 '{student_name}' 학생이 수업 중 AI와 나눈 질문 및 대화 내역입니다.

=== 페이지별 질문 내역 ===
{interaction_text if interaction_text else "없음"}

=== AI 채팅 대화 내역 ===
{chat_text if chat_text else "없음"}

위 데이터를 분석하여 다음 형식으로 학습 요약 보고서를 한국어로 작성하세요.
반드시 마크다운 형식을 사용하고, 각 섹션을 명확하게 구분하세요:

## 📊 학습 패턴 분석
이 학생이 주로 어떤 페이지/개념에서 질문했는지 2-3문장으로 설명

## 💡 핵심 개념 요약
학생이 질문한 내용을 바탕으로 중요 개념을 2-4개의 항목으로 정리
각 항목은 "**개념명**: 설명" 형식으로 작성

## 🔍 이해도 평가
질문의 깊이와 빈도를 바탕으로 이해도 수준을 평가 (상/중/하)하고 그 근거를 1-2문장으로 설명

## 📝 학습 권고사항
이 학생에게 권장하는 복습 방향이나 추가 학습 주제를 1-3가지 제시"""

    try:
        model = get_chat_model()
        messages = [
            SystemMessage(content="당신은 교육 데이터 분석 전문가로서 학생의 학습 보고서를 작성합니다. 반드시 한국어로 마크다운 형식으로 답변하세요."),
            HumanMessage(content=prompt)
        ]
        response = model.invoke(messages)
        result = response.content
        if isinstance(result, list):
            result = " ".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in result])
        return str(result)
    except Exception as e:
        print(f"[ReportGen] AI 요약 생성 실패: {e}")
        # Fallback
        lines = []
        lines.append("## 📊 학습 패턴 분석")
        if interactions:
            pages = list({i["page_number"] for i in interactions})
            lines.append(f"이 학생은 {len(pages)}개 페이지({', '.join(str(p) + '페이지' for p in sorted(pages))})에서 총 {len(interactions)}건의 질문을 했습니다.")
        else:
            lines.append("수업 중 AI에게 질문한 내역이 없습니다.")

        lines.append("\n## 💡 핵심 개념 요약")
        lines.append("**AI 요약 생성 실패**: 서버 재시작 후 다시 시도해 주세요.")

        lines.append("\n## 🔍 이해도 평가")
        lines.append(f"질문 횟수: {len(interactions)}건 기준으로 평가합니다.")

        lines.append("\n## 📝 학습 권고사항")
        lines.append("수업 자료를 다시 한 번 복습하고, 질문이 많았던 페이지를 중점적으로 학습하세요.")
        return "\n".join(lines)


def generate_student_report(class_id: str, student_id: str):
    """학생 개인 성취도, 참여도, AI 학습 요약 리포트 생성"""
    # 1. 학생 이름 조회
    user_res = supabase.table("users").select("name").eq("id", student_id).execute()
    student_name = user_res.data[0]["name"] if user_res.data else "학생"

    # 2. 퀴즈 성취도 조회 (공통/개인 구분)
    submissions_res = supabase.table("quiz_submissions").select("*").eq("student_id", student_id).execute()
    submissions = submissions_res.data or []

    # 문항별 타입 조회
    common_subs = []
    personal_subs = []
    for sub in submissions:
        q_res = supabase.table("quiz_questions")\
            .select("quiz_id, quiz_questions(quiz_id)")\
            .eq("id", sub["question_id"])\
            .execute()
        if q_res.data:
            q_info = q_res.data[0]
            quiz_id = q_info.get("quiz_id")
            if quiz_id:
                quiz_res = supabase.table("quizzes").select("quiz_type").eq("id", quiz_id).execute()
                if quiz_res.data:
                    qt = quiz_res.data[0].get("quiz_type", "common")
                    if qt == "common":
                        common_subs.append(sub)
                    else:
                        personal_subs.append(sub)
                    continue
        common_subs.append(sub)

    total_quizzes = len(submissions)
    correct_count = sum(1 for s in submissions if s.get("is_correct"))
    accuracy = round((correct_count / total_quizzes * 100), 1) if total_quizzes > 0 else 0

    # 3. 수업 참여도 조회
    student_res = supabase.table("class_students").select("total_questions").eq("class_id", class_id).eq("student_id", student_id).execute()
    total_questions = student_res.data[0]["total_questions"] if student_res.data else 0

    # 4. 페이지별 질문 인터랙션 조회
    interactions = _get_student_interactions(class_id, student_id)

    # 페이지별 집계
    page_stats = {}
    for intr in interactions:
        p = intr.get("page_number", 0)
        if p not in page_stats:
            page_stats[p] = {"count": 0, "questions": []}
        page_stats[p]["count"] += 1
        if intr.get("question_content"):
            page_stats[p]["questions"].append(intr["question_content"][:100])

    # 정렬된 페이지 목록 (질문 많은 순)
    sorted_pages = sorted(page_stats.items(), key=lambda x: x[1]["count"], reverse=True)

    # 5. 채팅 내역 조회
    chat_logs = _get_student_chat_history(class_id, student_id)

    # 6. AI 학습 요약 보고서 생성
    ai_summary = _generate_ai_student_summary(student_name, interactions, chat_logs)

    # 7. 제공된 퀴즈 정보 조회
    quizzes_res = supabase.table("quizzes").select("id, quiz_type").eq("class_id", class_id).execute()
    provided_common_quiz_count = sum(1 for q in (quizzes_res.data or []) if q["quiz_type"] == "common")
    provided_personal_quiz_count = sum(1 for q in (quizzes_res.data or []) if q["quiz_type"] == "personal" and q.get("target_student_id") == student_id)

    return {
        "student_id": student_id,
        "student_name": student_name,
        "performance": {
            "total_quizzes": total_quizzes,
            "correct_count": correct_count,
            "accuracy": accuracy,
            "common_correct": sum(1 for s in common_subs if s.get("is_correct")),
            "common_total": len(common_subs),
            "personal_correct": sum(1 for s in personal_subs if s.get("is_correct")),
            "personal_total": len(personal_subs),
        },
        "participation": {
            "total_questions": total_questions,
            "total_interactions": len(interactions),
            "chat_sessions": len(chat_logs),
        },
        "page_stats": [
            {"page": p, "count": s["count"], "sample_questions": s["questions"][:2]}
            for p, s in sorted_pages[:5]
        ],
        "ai_summary": ai_summary,
        "quiz_info": {
            "common_quiz_count": provided_common_quiz_count,
            "personal_quiz_count": provided_personal_quiz_count,
        }
    }


def generate_instructor_report(class_id: str):
    """강사용 수업 전체 종합 리포트 생성"""
    # 1. 학생 명단 및 전체 질문 수
    students_res = supabase.table("class_students").select("student_id, total_questions").eq("class_id", class_id).execute()
    students = students_res.data or []
    total_students = len(students)
    total_class_questions = sum(s.get("total_questions", 0) for s in students)

    # 2. 히트맵 기반 핫페이지 (실제 카운트 포함)
    interactions_res = supabase.table("interactions").select("page_number").eq("class_id", class_id).execute()
    page_counts: dict[int, int] = {}
    for row in (interactions_res.data or []):
        p = row["page_number"]
        page_counts[p] = page_counts.get(p, 0) + 1

    sorted_pages = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)
    hot_pages_detail = [
        {"page": p, "count": c} for p, c in sorted_pages[:5]
    ]
    max_count = hot_pages_detail[0]["count"] if hot_pages_detail else 1

    # 3. 반 평균 퀴즈 정답률
    student_ids = [s["student_id"] for s in students]
    avg_accuracy = 0.0
    student_quiz_stats = []
    if student_ids:
        all_subs = supabase.table("quiz_submissions").select("student_id, is_correct").in_("student_id", student_ids).execute()
        valid_subs = all_subs.data or []
        if valid_subs:
            total_corr = sum(1 for sub in valid_subs if sub.get("is_correct"))
            avg_accuracy = round((total_corr / len(valid_subs)) * 100, 1)

        # 학생별 정답률
        per_student: dict[str, dict] = {}
        for sub in valid_subs:
            sid = sub["student_id"]
            if sid not in per_student:
                per_student[sid] = {"correct": 0, "total": 0}
            per_student[sid]["total"] += 1
            if sub.get("is_correct"):
                per_student[sid]["correct"] += 1

        for sid, stats in per_student.items():
            u_res = supabase.table("users").select("name").eq("id", sid).execute()
            name = u_res.data[0]["name"] if u_res.data else "Unknown"
            student_quiz_stats.append({
                "student_id": sid,
                "name": name,
                "correct": stats["correct"],
                "total": stats["total"],
                "accuracy": round(stats["correct"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
            })

    # 4. 제공된 공통 퀴즈 목록
    quizzes_res = supabase.table("quizzes").select("id, quiz_type, created_at").eq("class_id", class_id).execute()
    common_quizzes = [q for q in (quizzes_res.data or []) if q["quiz_type"] == "common"]

    common_quiz_detail = []
    for cq in common_quizzes:
        q_res = supabase.table("quiz_questions").select("question_text, source_page").eq("quiz_id", cq["id"]).execute()
        questions = q_res.data or []
        source_pages = list({q["source_page"] for q in questions})
        common_quiz_detail.append({
            "quiz_id": cq["id"],
            "question_count": len(questions),
            "source_pages": sorted(source_pages),
            "sample_questions": [q["question_text"] for q in questions[:3]]
        })

    return {
        "overview": {
            "total_students": total_students,
            "total_questions": total_class_questions,
            "average_accuracy": avg_accuracy
        },
        "hot_pages": hot_pages_detail,
        "max_page_count": max_count,
        "common_quiz_info": common_quiz_detail,
        "student_quiz_stats": sorted(student_quiz_stats, key=lambda x: x["accuracy"], reverse=True)
    }
