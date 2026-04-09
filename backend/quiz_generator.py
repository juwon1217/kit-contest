import asyncio
import json
import re
from config import supabase
from ai_engine import get_chat_model
from langchain_core.messages import HumanMessage, SystemMessage


def get_hot_pages(class_id: str, top_n: int = 5) -> list[int]:
    """해당 강좌에서 가장 질문이 많았던 상위 N개 페이지 번호를 반환"""
    res = supabase.table("interactions").select("page_number").eq("class_id", class_id).execute()
    if not res.data:
        return [1, 2]

    counts = {}
    for item in res.data:
        p = item["page_number"]
        counts[p] = counts.get(p, 0) + 1

    sorted_pages = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [p for p, _ in sorted_pages[:top_n]]


def get_student_hot_pages(class_id: str, student_id: str, top_n: int = 3) -> list[int]:
    """특정 학생이 가장 많이 질문한 상위 N개 페이지 번호를 반환"""
    res = supabase.table("interactions").select("page_number").eq("class_id", class_id).eq("student_id", student_id).execute()
    if not res.data:
        return []

    counts = {}
    for item in res.data:
        p = item["page_number"]
        counts[p] = counts.get(p, 0) + 1

    sorted_pages = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [p for p, _ in sorted_pages[:top_n]]


def _parse_ai_quiz_response(raw_text: str) -> list[dict] | None:
    """AI 응답에서 JSON 배열을 파싱하여 반환"""
    # ```json ... ``` 블록 제거 시도
    cleaned = re.sub(r"```(?:json)?", "", raw_text).strip().rstrip("```").strip()
    # JSON 배열 직접 탐색
    match = re.search(r'\[.*?\]', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    try:
        return json.loads(cleaned)
    except Exception:
        return None


def _build_quiz_prompt(pages: list[int], quiz_label: str = "공통") -> str:
    return (
        f"당신은 교육용 퀴즈 출제 전문가입니다.\n"
        f"학생들이 가장 어려워한 PDF 페이지 번호들({pages})의 핵심 개념을 바탕으로 "
        f"사지선다형 객관식 퀴즈 3문제를 한국어로 생성하세요.\n\n"
        f"반드시 아래 JSON 배열 형식만 출력하세요. 다른 텍스트는 절대 포함하지 마세요:\n"
        f'[\n'
        f'  {{\n'
        f'    "question_text": "질문 내용",\n'
        f'    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],\n'
        f'    "correct_answer": "정확히 선택지 중 하나의 텍스트",\n'
        f'    "explanation": "왜 그것이 정답인지 2-3문장 설명",\n'
        f'    "source_page": {pages[0] if pages else 1}\n'
        f'  }}\n'
        f']'
    )


async def generate_common_quiz(class_id: str):
    """수업 종료 시 발동되는 공통 퀴즈 생성 로직 (실제 Gemini AI 사용)"""
    hot_pages = get_hot_pages(class_id, top_n=5)
    print(f"[QuizGen] 공통 퀴즈 생성 시작 - class_id={class_id}, hot_pages={hot_pages}")

    # 1. 퀴즈 마스터 생성
    quiz_data = {
        "class_id": class_id,
        "quiz_type": "common",
    }
    quiz_res = supabase.table("quizzes").insert(quiz_data).execute()
    if not quiz_res.data:
        print("[QuizGen] 퀴즈 마스터 생성 실패")
        return None
    quiz_id = quiz_res.data[0]["id"]

    # 2. Gemini AI로 퀴즈 생성
    questions_to_insert = []
    try:
        model = get_chat_model()
        prompt = _build_quiz_prompt(hot_pages, "공통")
        messages = [
            SystemMessage(content="당신은 교육용 퀴즈 출제 전문가입니다. 반드시 JSON 배열만 출력하세요."),
            HumanMessage(content=prompt)
        ]
        response = model.invoke(messages)
        raw = response.content
        if isinstance(raw, list):
            raw = " ".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in raw])

        parsed = _parse_ai_quiz_response(str(raw))
        if parsed:
            for q in parsed:
                questions_to_insert.append({
                    "quiz_id": quiz_id,
                    "question_text": f"[공통] {q.get('question_text', '질문')}",
                    "options": q.get("options", ["A", "B", "C", "D"]),
                    "correct_answer": q.get("correct_answer", "A"),
                    "explanation": q.get("explanation", "해설이 없습니다."),
                    "source_page": q.get("source_page", hot_pages[0] if hot_pages else 1)
                })
            print(f"[QuizGen] AI 파싱 성공 - {len(questions_to_insert)}문제")
        else:
            raise ValueError("JSON 파싱 실패")

    except Exception as e:
        print(f"[QuizGen] AI 생성 실패, 더미 fallback 사용: {e}")
        # Fallback 더미 퀴즈
        questions_to_insert = [
            {
                "quiz_id": quiz_id,
                "question_text": f"[공통] {hot_pages[0] if hot_pages else 1}페이지에서 주로 다룬 핵심 개념은 무엇입니까?",
                "options": ["데이터 모델링 기초", "API 보안 구조", "의존성 주입", "상태 관리"],
                "correct_answer": "데이터 모델링 기초",
                "explanation": "해당 페이지에서는 데이터 모델링의 기본 원칙에 대해 다루었습니다.",
                "source_page": hot_pages[0] if hot_pages else 1
            },
            {
                "quiz_id": quiz_id,
                "question_text": f"[공통] {hot_pages[1] if len(hot_pages) > 1 else 1}페이지의 내용 중 올바른 설명은?",
                "options": ["결합도를 높이는 것이 좋다", "외부 의존성은 내부에서 생성한다", "인터페이스를 활용하면 유연성이 증가한다", "전역 변수를 적극 활용한다"],
                "correct_answer": "인터페이스를 활용하면 유연성이 증가한다",
                "explanation": "인터페이스를 활용하면 구현체를 자유롭게 교체할 수 있어 유연성이 높아집니다.",
                "source_page": hot_pages[1] if len(hot_pages) > 1 else 1
            },
            {
                "quiz_id": quiz_id,
                "question_text": "[공통] 소프트웨어 설계에서 '단일 책임 원칙'이란?",
                "options": ["하나의 클래스가 모든 역할을 담당", "하나의 클래스는 하나의 책임만 가짐", "여러 클래스가 하나의 메서드 공유", "메서드는 항상 하나만 존재"],
                "correct_answer": "하나의 클래스는 하나의 책임만 가짐",
                "explanation": "단일 책임 원칙(SRP)은 클래스가 변경되는 이유가 오직 하나여야 함을 의미합니다.",
                "source_page": hot_pages[0] if hot_pages else 1
            }
        ]

    if questions_to_insert:
        supabase.table("quiz_questions").insert(questions_to_insert).execute()
        print(f"[QuizGen] 공통 퀴즈 {len(questions_to_insert)}문제 저장 완료")

    return quiz_id


async def generate_personal_quiz(class_id: str, student_id: str):
    """학생 개인 질문 바탕 맞춤형 퀴즈 생성 (실제 Gemini AI 사용)"""
    hot_pages = get_student_hot_pages(class_id, student_id, top_n=3)
    if not hot_pages:
        print(f"[QuizGen] 개인 퀴즈 생략: student_id={student_id} 질문 없음")
        return None

    print(f"[QuizGen] 개인 퀴즈 생성 시작 - student_id={student_id}, pages={hot_pages}")

    # 해당 학생의 질문 내용도 컨텍스트로 활용
    interactions_res = supabase.table("interactions")\
        .select("page_number, question_content")\
        .eq("class_id", class_id)\
        .eq("student_id", student_id)\
        .execute()

    student_questions_summary = ""
    if interactions_res.data:
        q_texts = [f"- (p.{row['page_number']}) {row['question_content']}" for row in interactions_res.data[:10]]
        student_questions_summary = "\n".join(q_texts)

    # 퀴즈 마스터 생성
    quiz_data = {
        "class_id": class_id,
        "quiz_type": "personal",
        "target_student_id": student_id
    }
    quiz_res = supabase.table("quizzes").insert(quiz_data).execute()
    if not quiz_res.data:
        return None
    quiz_id = quiz_res.data[0]["id"]

    questions_to_insert = []
    try:
        model = get_chat_model()
        prompt = (
            f"당신은 교육용 퀴즈 출제 전문가입니다.\n"
            f"한 학생이 수업 중 다음 페이지들({hot_pages})에서 주로 질문했습니다.\n"
        )
        if student_questions_summary:
            prompt += f"\n학생의 주요 질문 내용:\n{student_questions_summary}\n"
        prompt += (
            f"\n위 내용을 바탕으로 이 학생에게 맞춤화된 사지선다형 객관식 퀴즈 2문제를 한국어로 생성하세요.\n"
            f"반드시 아래 JSON 배열 형식만 출력하세요:\n"
            f'[\n'
            f'  {{\n'
            f'    "question_text": "질문 내용",\n'
            f'    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],\n'
            f'    "correct_answer": "정확히 선택지 중 하나의 텍스트",\n'
            f'    "explanation": "왜 그것이 정답인지 설명",\n'
            f'    "source_page": {hot_pages[0]}\n'
            f'  }}\n'
            f']'
        )
        messages = [
            SystemMessage(content="당신은 교육용 퀴즈 출제 전문가입니다. 반드시 JSON 배열만 출력하세요."),
            HumanMessage(content=prompt)
        ]
        response = model.invoke(messages)
        raw = response.content
        if isinstance(raw, list):
            raw = " ".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in raw])

        parsed = _parse_ai_quiz_response(str(raw))
        if parsed:
            for q in parsed:
                questions_to_insert.append({
                    "quiz_id": quiz_id,
                    "question_text": f"[개인] {q.get('question_text', '질문')}",
                    "options": q.get("options", ["A", "B", "C", "D"]),
                    "correct_answer": q.get("correct_answer", "A"),
                    "explanation": q.get("explanation", "해설이 없습니다."),
                    "source_page": q.get("source_page", hot_pages[0])
                })
        else:
            raise ValueError("JSON 파싱 실패")

    except Exception as e:
        print(f"[QuizGen] 개인 AI 생성 실패, 더미 fallback: {e}")
        questions_to_insert = [
            {
                "quiz_id": quiz_id,
                "question_text": f"[개인] {hot_pages[0]}페이지에서 질문하셨던 개념 중 올바른 것은?",
                "options": ["결합도를 높이는 방식이 올바르다", "외부에서 객체를 주입받아 유연성을 높인다", "전역 상태를 남용하면 안정성이 높아진다", "단일 클래스에 모든 역할을 집중시킨다"],
                "correct_answer": "외부에서 객체를 주입받아 유연성을 높인다",
                "explanation": "의존성 주입(DI) 패턴은 클래스 외부에서 의존 객체를 제공받아 결합도를 낮추는 핵심 패턴입니다.",
                "source_page": hot_pages[0]
            }
        ]

    if questions_to_insert:
        supabase.table("quiz_questions").insert(questions_to_insert).execute()
        print(f"[QuizGen] 개인 퀴즈 저장 완료: student_id={student_id}")

    return quiz_id


async def generate_all_quizzes(class_id: str):
    """공통 퀴즈 + 전체 학생 개인 퀴즈를 한 번에 생성"""
    # 공통 퀴즈 생성
    await generate_common_quiz(class_id)

    # 수강 학생 목록 조회
    students_res = supabase.table("class_students").select("student_id").eq("class_id", class_id).execute()
    if students_res.data:
        for s in students_res.data:
            await generate_personal_quiz(class_id, s["student_id"])

    print(f"[QuizGen] 전체 퀴즈 생성 완료: class_id={class_id}")


def trigger_quiz_generation(class_id: str):
    """백그라운드 태스크로 전체 퀴즈 생성 시작 (공통 + 모든 학생 개인)"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(generate_all_quizzes(class_id))
        else:
            asyncio.run(generate_all_quizzes(class_id))
    except RuntimeError:
        import threading
        def run_in_thread():
            asyncio.run(generate_all_quizzes(class_id))
        t = threading.Thread(target=run_in_thread, daemon=True)
        t.start()
