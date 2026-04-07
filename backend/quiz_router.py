from fastapi import APIRouter, Depends, HTTPException
from auth_module import get_current_user
from quiz_generator import trigger_quiz_generation
from quiz_engine import get_quizzes_for_student, evaluate_answer
from pydantic import BaseModel

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

class SubmitAnswerReq(BaseModel):
    answer: str

@router.post("/{class_id}/generate")
def generate_quiz_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """수동으로 공통 퀴즈 생성 트리거 (강사 전용 보호 로직 추가 가능)"""
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    trigger_quiz_generation(class_id)
    return {"message": "Quiz generation started in background."}

@router.get("/{class_id}")
def get_quiz_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """수업 종료 후 퀴즈 조회"""
    quizzes = get_quizzes_for_student(class_id, user["id"])
    if not quizzes:
        return {"message": "아직 퀴즈가 생성되지 않았습니다.", "quizzes": []}
    return {"quizzes": quizzes}

@router.post("/{class_id}/submit/{question_id}")
def submit_answer_endpoint(class_id: str, question_id: str, req: SubmitAnswerReq, user: dict = Depends(get_current_user)):
    """문항에 대한 답안 제출 및 채점/해설 확인"""
    result = evaluate_answer(question_id, user["id"], req.answer)
    return result

@router.get("/{class_id}/explanation/{question_id}")
def get_explanation_endpoint(class_id: str, question_id: str, user: dict = Depends(get_current_user)):
    """채점 없이 단순 해설만 조회하기 위함"""
    # 엔진 코드에 분리 작성 가능하지만 MVP로 임시 차단
    raise HTTPException(status_code=501, detail="Not Implemented Yet")
