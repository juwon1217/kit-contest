import asyncio
from config import supabase
from ai_engine import get_chat_model

def get_hot_pages(class_id: str, top_n: int = 5) -> list[int]:
    """해당 강좌에서 가장 질문이 많았던 상위 N개 페이지 번호를 반환"""
    # MVP 임시 로직: Supabase RPC나 Group by 쿼리가 복잡하므로 
    # 모든 상호작용을 가져와서 파이썬 단에서 집계 시뮬레이션
    res = supabase.table("interactions").select("page_number").eq("class_id", class_id).execute()
    if not res.data:
        # 질문이 없었던 경우 디폴트로 1, 2 페이지 등 반환 (더미 목적)
        return [1, 2]
    
    counts = {}
    for item in res.data:
        p = item["page_number"]
        counts[p] = counts.get(p, 0) + 1
        
    sorted_pages = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [p for p, _ in sorted_pages[:top_n]]

async def generate_common_quiz(class_id: str):
    """수업 종료 시 발동되는 공통 퀴즈 생성 로직"""
    hot_pages = get_hot_pages(class_id)
    
    # 1. 퀴즈 마스터(메타데이터) 생성
    quiz_data = {
        "class_id": class_id,
        "quiz_type": "common",
    }
    quiz_res = supabase.table("quizzes").insert(quiz_data).execute()
    if not quiz_res.data:
        return None
    quiz_id = quiz_res.data[0]["id"]
    
    # 2. AI_Engine을 통해 퀴즈 문제 생성
    # 실제 환경: PDF 텍스트를 추출해서 프롬프트로 던짐.
    # MVP 로직: AI Engine에 핫페이지 번호들만 던져서 더미 문제 생성.
    try:
        # ai_engine.generate_quiz()가 있다고 가정하거나 직접 langchain 사용
        prompt = f"다음은 학생들이 가장 어려워한 PDF 페이지 번호들입니다: {hot_pages}. 이 페이지들의 핵심 개념에 대한 사지선다형 객관식 퀴즈 3문제를 생성해 주세요. 결과는 반드시 JSON 배열 형태로, 각 원소는 {{'question_text': '...', 'options': ['1','2','3','4'], 'correct_answer': '정답 텍스트', 'explanation': '해설 내용', 'source_page': 관련된_페이지_번호}} 여야 합니다."
        
        model = get_chat_model()
        response = model.invoke(prompt)
        # 응답 파싱 시뮬레이션 (파싱 오류 방지를 위해 명시적 더미로 대체될 수 있음)
        # 여기서는 모델이 올바른 JSON 문자열을 리턴했다고 가정. 단순화를 위해 더미 데이터 삽입
        
        dummy_questions = [
            {
                "quiz_id": quiz_id,
                "question_text": f"[AI 자동생성] {hot_pages[0] if hot_pages else 1}페이지에서 주로 다룬 핵심 개념은 무엇입니까?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation": "해당 개념의 핵심은 A입니다.",
                "source_page": hot_pages[0] if hot_pages else 1
            },
            {
                "quiz_id": quiz_id,
                "question_text": "[AI 자동생성] 다음 중 올바른 설명은?",
                "options": ["옵션1", "옵션2", "옵션3", "옵션4"],
                "correct_answer": "옵션2",
                "explanation": "옵션2가 올바른 설명입니다.",
                "source_page": hot_pages[1] if len(hot_pages) > 1 else 1
            }
        ]
        
        supabase.table("quiz_questions").insert(dummy_questions).execute()
    except Exception as e:
        print(f"Quiz Generation Error: {e}")

async def generate_personal_quiz(class_id: str, student_id: str):
    """학생 개인 질문 바탕 맞춤형 퀴즈 생성 로직 (MVP: 생략 및 더미 처리 가능)"""
    pass

def trigger_quiz_generation(class_id: str):
    """백그라운드 태스크로 퀴즈 생성 시작"""
    loop = asyncio.get_event_loop()
    loop.create_task(generate_common_quiz(class_id))
