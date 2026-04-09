import config
import json
import re
from ai_engine import get_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

# ========================== AI 헬퍼 함수 ==========================

async def _generate_ai_instructor_summary(class_id: str) -> str:
    """반 전체 대화 내역을 취합하여 강사용 종합 분석 보고서 생성"""
    try:
        # 1. 반 전체 채팅 세션 및 메시지 가져오기
        sessions_res = await config.supabase.table("chat_sessions")\
            .select("id, student_id")\
            .eq("class_id", class_id)\
            .execute()
        
        if not sessions_res.data:
            return "아직 학생들이 AI와 대화를 나눈 내역이 없습니다."
        
        session_ids = [s["id"] for s in sessions_res.data]
        messages_res = await config.supabase.table("chat_messages")\
            .select("role, content")\
            .in_("session_id", session_ids)\
            .order("created_at")\
            .execute()
        
        if not messages_res.data:
            return "아직 학생들이 AI와 대화를 나눈 내역이 없습니다."

        # 대화 로그 텍스트 구성
        log_text = ""
        for msg in messages_res.data[:100]: # 토큰 제한 방지 (상위 100개 메시지)
            role = "학생" if msg["role"] == "user" else "AI"
            log_text += f"{role}: {msg['content'][:150]}\n"

        prompt = f"""당신은 교육 컨설턴트입니다. 
아래는 오늘 수업 중 학생들이 AI와 나눈 대화 로그의 일부입니다.
이 데이터를 분석하여 강사에게 수업 피드백을 한국어로 제공하세요.

[대화 로그 데이터]
{log_text}

[작성 지침]
1. 학생들이 공통적으로 어려워하거나 질문이 많았던 핵심 개념이나 주제가 무엇인지 분석하세요.
2. 학생들의 전반적인 이해도 상태를 요약하세요.
3. 다음 수업 시작 전, 학생들이 놓치고 있을 법한 내용을 중심으로 5분 내외의 '복습 추천 내용'을 제시하세요.
4. 반드시 강사에게 조언하는 정중하고 전문적인 줄글 형태로 작성하세요.
5. 마크다운 형식을 사용하세요."""

        model = get_chat_model()
        messages = [
            SystemMessage(content="당신은 수업 분석 및 교수법 코칭 전문가입니다."),
            HumanMessage(content=prompt)
        ]
        response = model.invoke(messages)
        return str(response.content)
    except Exception as e:
        print(f"[InstructorSummary] Error: {e}")
        return "데이터 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."

async def _generate_ai_flashcards(chat_logs: list) -> list[str]:
    """학생 개인의 대화 내역을 기반으로 5~7개의 핵심 복습 카드 생성"""
    try:
        if not chat_logs:
            return ["복습 필수 내용", "아직 수업 중 AI와 대화한 내용이 없어요.", "다음 수업에서는 궁금한 점을 질문해 보세요!"]

        # 텍스트 구성
        all_text = ""
        for log in chat_logs[:5]:
            for msg in log.get("messages", [])[:10]:
                if msg["role"] == "user":
                    all_text += f"질문: {msg['content']}\n"
        
        if not all_text:
             return ["복습 필수 내용", "오늘 수업에서는 조용히 강의를 들으셨네요!", "다음에는 궁금한 점을 AI에게 물어보세요."]

        prompt = f"""당신은 학습 도우미입니다. 
학생의 질문 내역을 바탕으로, 이 학생이 꼭 기억해야 할 핵심 개념 5가지를 짧은 문장(카드) 형태로 뽑아주세요.

[학생 질문 내역]
{all_text}

[작성 지침]
- 각 카드는 1~2문장의 아주 짧은 메모 형태여야 합니다.
- 반드시 한국어로 작성하세요.
- JSON 배열 형식으로만 응답하세요. 예: ["내용1", "내용2", ...]
- 첫 번째 카드는 무시하고 그 다음부터 5개 내외로 생성하세요."""

        model = get_chat_model()
        response = model.invoke([HumanMessage(content=prompt)])
        
        # JSON 전처리를 위한 정규식 (마크다운 코드 블록 제거 등)
        content = str(response.content)
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            cards = json.loads(match.group())
            return ["복습 필수 내용"] + cards[:7]
        return ["복습 필수 내용", "핵심 내용을 정리하는 중입니다.", "잠시 후 다시 확인해 주세요."]
    except Exception as e:
        print(f"[Flashcards] Error: {e}")
        return ["복습 필수 내용", "학습 데이터를 분석하지 못했습니다.", "교재를 중심으로 복습해 보세요!"]

# ========================== 메인 리포트 생성 함수 ==========================

async def generate_student_report(class_id: str, student_id: str):
    """학생 개인 리포트: 오답 노트 + AI 플래시카드"""
    # 1. 학생 이름 조회
    user_res = await config.supabase.table("users").select("name").eq("id", student_id).execute()
    student_name = user_res.data[0]["name"] if user_res.data else "학생"

    # 2. 오답 퀴즈 조회 (현재 수업에 속한 것만)
    # 2-1. 현재 수업의 퀴즈 ID들 먼저 조회
    quizzes_res = await config.supabase.table("quizzes").select("id").eq("class_id", class_id).execute()
    current_quiz_ids = [q["id"] for q in (quizzes_res.data or [])]
    
    incorrect_quizzes = []
    if current_quiz_ids:
        # 2-2. 해당 퀴즈들에 속한 문항들 중 이 학생이 틀린 것 조회
        # PostgREST의 조인 필터 활용: quiz_questions!inner(quiz_id)
        subs_res = await config.supabase.table("quiz_submissions")\
            .select("*, quiz_questions!inner(quiz_id, question_text, options, explanation, correct_answer)")\
            .eq("student_id", student_id)\
            .eq("is_correct", False)\
            .in_("quiz_questions.quiz_id", current_quiz_ids)\
            .execute()
        
        if subs_res.data:
            for sub in subs_res.data:
                q_info = sub["quiz_questions"]
                incorrect_quizzes.append({
                    "question": q_info["question_text"],
                    "user_answer": sub["submitted_answer"],
                    "correct_answer": q_info["correct_answer"],
                    "explanation": q_info["explanation"]
                })



    # 3. 플래시카드 생성을 위한 채팅 로그 조회
    session_res = await config.supabase.table("chat_sessions")\
        .select("id")\
        .eq("class_id", class_id)\
        .eq("student_id", student_id)\
        .execute()
    
    chat_logs = []
    if session_res.data:
        s_ids = [s["id"] for s in session_res.data]
        msgs_res = await config.supabase.table("chat_messages")\
            .select("session_id, role, content")\
            .in_("session_id", s_ids)\
            .order("created_at")\
            .execute()
        
        # 세션별 그룹화
        for s_id in s_ids:
            group = [m for m in (msgs_res.data or []) if m["session_id"] == s_id]
            if group:
                chat_logs.append({"messages": group})

    # 4. AI 플래시카드 생성
    flashcards = await _generate_ai_flashcards(chat_logs)

    return {
        "student_name": student_name,
        "incorrect_quizzes": incorrect_quizzes,
        "flashcards": flashcards
    }

async def generate_instructor_report(class_id: str):
    """강사용 종합 리포트: AI 분석 + 핫페이지 + 퀴즈 목록 + 명단"""
    # 1. 참여 학생 명단
    class_students_res = await config.supabase.table("class_students").select("student_id").eq("class_id", class_id).execute()
    student_ids = [s["student_id"] for s in (class_students_res.data or [])]
    
    student_roster = []
    if student_ids:
        users_res = await config.supabase.table("users").select("name").in_("id", student_ids).execute()
        student_roster = [u["name"] for u in (users_res.data or [])]

    # 2. 핫페이지 TOP 5 (공동 순위 대응)
    interactions_res = await config.supabase.table("interactions").select("page_number").eq("class_id", class_id).execute()
    page_counts = {}
    for row in (interactions_res.data or []):
        p = row["page_number"]
        page_counts[p] = page_counts.get(p, 0) + 1
    
    # 순위 계산 (동점자 포함)
    sorted_items = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)
    hot_pages = []
    if sorted_items:
        # 상위 5개의 빈도(count)를 기준으로 추출
        rank_counts = sorted(list(set(page_counts.values())), reverse=True)[:5]
        for p, c in sorted_items:
            if c in rank_counts:
                hot_pages.append({"page": p, "count": c})

    # 3. 출제된 공통 퀴즈 정보
    quizzes_res = await config.supabase.table("quizzes").select("id").eq("class_id", class_id).eq("quiz_type", "common").execute()
    common_quizzes = []
    if quizzes_res.data:
        q_master_ids = [q["id"] for q in quizzes_res.data]
        questions_res = await config.supabase.table("quiz_questions")\
            .select("quiz_id, question_text")\
            .in_("quiz_id", q_master_ids)\
            .execute()
        
        # 퀴즈별 그룹화
        for qm_id in q_master_ids:
            qs = [q["question_text"] for q in (questions_res.data or []) if q["quiz_id"] == qm_id]
            if qs:
                common_quizzes.append({"id": qm_id, "questions": qs})

    # 4. AI 종합 분석 요약
    ai_summary = await _generate_ai_instructor_summary(class_id)

    return {
        "ai_summary": ai_summary,
        "hot_pages": hot_pages,
        "common_quizzes": common_quizzes,
        "student_roster": student_roster
    }
