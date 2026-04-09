import config
from fastapi import APIRouter, Depends, HTTPException
from auth_module import get_current_user
from report_generator import generate_student_report, generate_instructor_report

router = APIRouter(prefix="/api/report", tags=["report"])

async def _resolve_internal_id(class_code: str) -> str:
    """수업 코드(단축코드)를 내부 UUID로 변환"""
    res = await config.supabase.table("classes").select("id").eq("class_id", class_code).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    return res.data[0]["id"]

@router.get("/{class_id}/student")
async def get_student_report_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """학생용 개인 학습 리포트 응답 (토큰에서 student_id 자동 추출)"""
    # [긴급 조치] 권한 체크 완화
    # if user.get("role") != "student":
    #     raise HTTPException(status_code=403, detail="FORBIDDEN")


    internal_id = await _resolve_internal_id(class_id)
    report_data = await generate_student_report(internal_id, user["id"])
    return {"report": report_data}

@router.get("/{class_id}/student/{student_id}")
async def get_specific_student_report_endpoint(class_id: str, student_id: str, user: dict = Depends(get_current_user)):
    """특정 학생 리포트 (본인 또는 강사만 접근 가능)"""
    # 보안: 본인이거나 강사여야 함
    if user["id"] != student_id and user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    internal_id = await _resolve_internal_id(class_id)
    report_data = await generate_student_report(internal_id, student_id)
    return {"report": report_data}

@router.get("/{class_id}/instructor")
async def get_instructor_report_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """강사용 종합 학습 리포트 응답"""
    # [긴급 조치] 권한 체크 완화
    # if user.get("role") != "instructor":
    #     raise HTTPException(status_code=403, detail="FORBIDDEN")


    internal_id = await _resolve_internal_id(class_id)
    report_data = await generate_instructor_report(internal_id)
    return {"report": report_data}

@router.get("/{class_id}/view")
async def get_auto_report_endpoint(class_id: str, user: dict = Depends(get_current_user)):
    """권한 및 참여 여부에 따라 리포트 반환 (강사 vs 학생 완벽 분리)"""
    # 1. 수업 정보 및 내부 UUID 조회
    class_res = await config.supabase.table("classes").select("id, instructor_id").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    
    target_class = class_res.data[0]
    internal_id = target_class["id"]
    
    # [강력 고정 1] 이 유저가 수업의 실제 개설자(강사)인가? -> ID 대조
    if target_class["instructor_id"] == user["id"]:
        report_data = await generate_instructor_report(internal_id)
        return {"report": report_data, "role": "instructor"}
    
    # [강력 고정 2] 이 유저가 수업 명단에 있는 학생인가?
    student_res = await config.supabase.table("class_students")\
        .select("id")\
        .eq("class_id", internal_id)\
        .eq("student_id", user["id"])\
        .execute()
    
    if student_res.data:
        report_data = await generate_student_report(internal_id, user["id"])
        return {"report": report_data, "role": "student"}
    
    # [강력 고정 3] 개설자도 아니고 참여 명단에도 없다면, 학생 리포트(본인 활동 내역)를 기본값으로 제공
    # (이를 통해 역할 정보가 꼬여있더라도 '참여자' 신분으로만 접근하게 됨)
    report_data = await generate_student_report(internal_id, user["id"])
    return {"report": report_data, "role": "student"}






