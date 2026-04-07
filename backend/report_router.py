from fastapi import APIRouter, Depends, HTTPException
from auth_module import get_current_user
from report_generator import generate_student_report, generate_instructor_report

router = APIRouter(prefix="/api/report", tags=["report"])

@router.get("/{class_id}/student/{student_id}")
def get_student_report_endpoint(class_id: str, student_id: str, user: dict = Depends(get_current_user)):
    """학생용 개인 학습 리포트 응답"""
    # 본인 조회 요청인지 또는 강사인지 권한 검사 (MVP 생략 가능)
    if user["id"] != student_id and user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="FORBIDDEN")
        
    report_data = generate_student_report(class_id, student_id)
    return {"report": report_data}

@router.get("/{class_id}/instructor")
def get_instructor_report_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """강사용 종합 학습 리포트 응답"""
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="FORBIDDEN")
        
    report_data = generate_instructor_report(class_id)
    return {"report": report_data}
