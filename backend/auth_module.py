import uuid
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
import config


router = APIRouter(prefix="/api/auth", tags=["auth"])

class RoleUpdateRequest(BaseModel):
    role: str # "instructor" | "student"

class SimpleLoginRequest(BaseModel):
    role: str # "instructor" | "student"
    name: str
    student_id: Optional[str] = None

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")
    
    token = authorization.split(" ")[1]

    if config.supabase is None:
        raise HTTPException(status_code=500, detail="SUPABASE_NOT_CONFIGURED")

    # DB에서 token(UUID) 기준으로 사용자 확인
    db_user = await config.supabase.table("users").select("*").eq("id", token).execute()

    if not db_user.data:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED_USER_NOT_FOUND")

    return db_user.data[0]


@router.post("/simple-login")
async def simple_login(request: SimpleLoginRequest):
    if request.role not in ["instructor", "student"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    if request.role == "student" and request.student_id:
        display_name = f"{request.student_id} {request.name}".strip()
    else:
        display_name = request.name.strip()

    # [수정] 기존 사용자가 있는지 확인 (이름과 역할 기준)
    # 단순 로그인 환경에서 세션 유실 방지를 위해 기존 정보를 반환합니다.
    existing = await config.supabase.table("users")\
        .select("*")\
        .eq("name", display_name)\
        .eq("role", request.role)\
        .execute()
        
    if existing.data:
        return {"user": existing.data[0], "token": existing.data[0]["id"]}

    new_id = str(uuid.uuid4())
    new_user = {
        "id": new_id,
        "email": f"{new_id}@example.com",
        "name": display_name,
        "role": request.role
    }
    
    inserted = await config.supabase.table("users").insert(new_user).execute()

    if not inserted.data:
        raise HTTPException(status_code=500, detail="Failed to create simple user")
        
    return {"user": inserted.data[0], "token": new_id}




@router.post("/callback")
async def handle_oauth_callback(authorization: Optional[str] = Header(None)):
    """프론트엔드에서 발급받은 access_token을 전달받아 DB 동기화 후 유저 정보를 리턴"""
    user = await get_current_user(authorization)
    return {"user": user}

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}


@router.put("/role")
async def set_role(request: RoleUpdateRequest, user: dict = Depends(get_current_user)):
    if request.role not in ["instructor", "student"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'instructor' or 'student'")
    
    updated = await config.supabase.table("users").update({"role": request.role}).eq("id", user["id"]).execute()

    if not updated.data:
        raise HTTPException(status_code=500, detail="Failed to update role")
        
    return {"user": updated.data[0]}

