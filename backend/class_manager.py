import random
import string
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import Response
from typing import Optional
from config import supabase
from auth_module import get_current_user

router = APIRouter(prefix="/api/classes", tags=["classes"])

def generate_class_id(length=6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("")
async def create_class(
    title: str = Form(...),
    total_pages: int = Form(0),
    pdf_file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="FORBIDDEN")
        
    if supabase is None:
        raise HTTPException(status_code=500, detail="SUPABASE_NOT_CONFIGURED")

    file_ext = pdf_file.filename.split(".")[-1]
    file_path = f"{user['id']}/{uuid.uuid4()}.{file_ext}"

    # PDF 파일을 Supabase Storage에 업로드 (버킷 이름: pdfs 로 가정)
    try:
        res = supabase.storage.from_("pdfs").upload(file_path, await pdf_file.read())
        # public URL 대신 버킷 내 경로를 저장
        pdf_url = file_path
    except Exception as e:
        print(f"Upload Error: {e}")
        pdf_url = "https://example.com/fallback.pdf" # MVP fallback

    # 충돌 방지를 위한 Class ID 생성 로직 반복 (최대 5회)
    class_id = None
    for _ in range(5):
        temp_id = generate_class_id()
        existing = supabase.table("classes").select("id").eq("class_id", temp_id).execute()
        if not existing.data:
            class_id = temp_id
            break
            
    if not class_id:
        raise HTTPException(status_code=500, detail="Failed to generate unique Class ID")

    new_class = {
        "class_id": class_id,
        "instructor_id": user["id"],
        "title": title,
        "pdf_url": pdf_url,
        "total_pages": total_pages,
        "status": "active"
    }
    
    inserted = supabase.table("classes").insert(new_class).execute()
    return {"class": inserted.data[0]}

@router.get("/{class_id}")
def get_class(class_id: str, user: dict = Depends(get_current_user)):
    res = supabase.table("classes").select("*").eq("class_id", class_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    return {"class": res.data[0]}

@router.post("/{class_id}/join")
def join_class(class_id: str, user: dict = Depends(get_current_user)):
    # 1. 수업 유효성 검사
    class_res = supabase.table("classes").select("*").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=400, detail="INVALID_CLASS_ID")
    
    target_class = class_res.data[0]
    
    if target_class["status"] == "ended":
        raise HTTPException(status_code=410, detail="CLASS_ENDED")
        
    # 2. 학생 등록 (이미 존재하면 무시)
    existing = supabase.table("class_students").select("*").eq("class_id", target_class["id"]).eq("student_id", user["id"]).execute()
    if existing.data:
        # 상태 업데이트 (온라인 처리 가능)
        supabase.table("class_students").update({"is_online": True}).eq("id", existing.data[0]["id"]).execute()
        return {"class": target_class, "message": "Already joined"}
        
    new_student = {
        "class_id": target_class["id"],
        "student_id": user["id"],
        "is_online": True
    }
    supabase.table("class_students").insert(new_student).execute()
    
    return {"class": target_class, "message": "Joined successfully"}

@router.put("/{class_id}/end")
def end_class(class_id: str, user: dict = Depends(get_current_user)):
    class_res = supabase.table("classes").select("*").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=400, detail="INVALID_CLASS_ID")
        
    target_class = class_res.data[0]
    if target_class["instructor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    if target_class.get("status") == "ended":
        return {"message": "Already ended", "class": target_class}
        
    from datetime import datetime, timezone
    updated = supabase.table("classes").update({
        "status": "ended",
        "ended_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", target_class["id"]).execute()
    
    # 퀴즈 생성 트리거 (공통 + 모든 학생 개인 퀴즈)
    from quiz_generator import trigger_quiz_generation
    trigger_quiz_generation(target_class["id"])
    
    return {"message": "Class ended successfully", "class": updated.data[0]}

@router.get("/{class_id}/status")
def get_class_status(class_id: str):
    """수업 상태 조회 (학생 폴링용 - 인증 불필요)"""
    class_res = supabase.table("classes").select("class_id, status, ended_at").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    
    data = class_res.data[0]
    return {
        "class_id": data["class_id"],
        "status": data["status"],
        "ended_at": data.get("ended_at")
    }

@router.get("/{class_id}/roster")
def get_class_roster(class_id: str, user: dict = Depends(get_current_user)):
    class_res = supabase.table("classes").select("id").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    internal_class_id = class_res.data[0]["id"]
    
    students_res = supabase.table("class_students").select("student_id, is_online, total_questions").eq("class_id", internal_class_id).execute()
    
    roster = []
    if students_res.data:
        for s in students_res.data:
            u_res = supabase.table("users").select("name, profile_image").eq("id", s["student_id"]).execute()
            if u_res.data:
                u_info = u_res.data[0]
                p_img = u_info.get("profile_image")
                if not p_img:
                    name = u_info.get("name", "👤")
                    p_img = name[0] if name else "👤"

                roster.append({
                    "studentId": s["student_id"],
                    "name": u_info.get("name", "Unknown"),
                    "profileImage": p_img,
                    "totalQuestions": s.get("total_questions", 0),
                    "isOnline": s.get("is_online", False)
                })
    return {"roster": roster}

@router.get("/{class_id}/heatmap")
def get_class_heatmap(class_id: str, user: dict = Depends(get_current_user)):
    class_res = supabase.table("classes").select("id").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    internal_class_id = class_res.data[0]["id"]
    
    from interaction_recorder import interaction_recorder
    heatmap_data = interaction_recorder.get_page_heatmap(internal_class_id)
    return {"heatmap": heatmap_data}

@router.get("/{class_id}/pdf")
def get_class_pdf(class_id: str):
    # 프론트엔드 PDF 로딩 시 인증 헤더가 복잡할 수 있으므로 Depends 제거 (방 코드 인증 목적)
    class_res = supabase.table("classes").select("pdf_url").eq("class_id", class_id).execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
        
    file_path = class_res.data[0].get("pdf_url")
    if not file_path or file_path == "https://example.com/fallback.pdf":
        raise HTTPException(status_code=404, detail="NO_PDF")
        
    # 구버전 url 대응
    if file_path.startswith("http"):
        try:
            file_path = file_path.split("pdfs/")[-1]
        except:
             raise HTTPException(status_code=404)

    try:
        pdf_bytes = supabase.storage.from_("pdfs").download(file_path)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        print(f"PDF DB Download err: {e}")
        raise HTTPException(status_code=404, detail="PDF_FETCH_FAILED")

