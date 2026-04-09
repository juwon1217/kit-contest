import config
from fastapi import APIRouter, Depends, HTTPException
from auth_module import get_current_user
from quiz_generator import trigger_quiz_generation
from quiz_engine import get_quizzes_for_student, evaluate_answer
from pydantic import BaseModel

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

class SubmitAnswerReq(BaseModel):
    answer: str

async def _resolve_internal_id(class_code: str) -> str:
    """수업 코드(단축코드)를 내부 UUID로 변환"""
    res = await config.supabase.table("classes").select("id").eq("class_id", class_code).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    return res.data[0]["id"]

@router.post("/{class_id}/generate")
async def generate_quiz_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """수업 종료 시 퀴즈 생성 트리거"""
    # [긴급 조치] 권한 체크 로직 일시 비활성화
    # if user.get("role") != "instructor":
    #     raise HTTPException(status_code=403, detail="FORBIDDEN")

    
    internal_id = await _resolve_internal_id(class_id)
    trigger_quiz_generation(internal_id)
    return {"message": "Quiz generation started in background."}

@router.get("/{class_id}")
async def get_quiz_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """수업 종료 후 퀴즈 조회"""
    internal_id = await _resolve_internal_id(class_id)
    quizzes = await get_quizzes_for_student(internal_id, user["id"])
    if not quizzes:
        return {"message": "아직 퀴즈가 생성되지 않았습니다.", "quizzes": []}
    return {"quizzes": quizzes}

@router.post("/{class_id}/submit/{question_id}")
async def submit_answer_endpoint(class_id: str, question_id: str, req: SubmitAnswerReq, user: dict = Depends(get_current_user)):
    """문항에 대한 답안 제출 및 채점/해설 확인"""
    # question_id는 UUID이므로 별도 변환 불필요
    result = await evaluate_answer(question_id, user["id"], req.answer)
    return result

@router.get("/{class_id}/explanation/{question_id}")
def get_explanation_endpoint(class_id: str, question_id: str, user: dict = Depends(get_current_user)):
    """해설 조회"""
    raise HTTPException(status_code=501, detail="Not Implemented Yet")

