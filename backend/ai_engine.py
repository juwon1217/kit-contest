import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from auth_module import get_current_user
from interaction_recorder import interaction_recorder, InteractionCreate
from chat_manager import chat_manager

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Gemini API 설정 (결위 처리)
# 사용자는 .env 파일에 GOOGLE_API_KEY를 설정해야 함
api_key = os.getenv("GOOGLE_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

def get_chat_model():
    # 환경 변수에 API 키가 설정되어 있지 않다면 더미 모델 반환 등의 처리 가능하지만
    # 일단 객체 생성 시도
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", google_api_key=api_key, max_retries=3, convert_system_message_to_human=True)

class ExplainTextRequest(BaseModel):
    class_id: str
    page: int
    text: str
    pdf_context: str = ""

class ExplainImageRequest(BaseModel):
    class_id: str
    page: int
    image_base64: str
    pdf_context: str = ""

class ChatRequest(BaseModel):
    session_id: str
    message: str
    page: int


@router.post("/explain")
async def explain_text(req: ExplainTextRequest, user: dict = Depends(get_current_user)):
    import config
    class_res = await config.supabase.table("classes").select("id").eq("class_id", req.class_id).execute()

    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    internal_class_id = class_res.data[0]["id"]

    # 1. 채팅 세션 생성
    session_id = await chat_manager.create_session(internal_class_id, user["id"], "text_drag", req.text)

    # 2. AI 해설 생성
    try:
        model = get_chat_model()
        messages = [
            SystemMessage(content="당신은 친절한 AI 조교입니다. 학생이 수업 자료에서 보낸 텍스트를 반드시 '한국어'로, 최대한 쉽고 핵심만 짧게 요약해서 설명해 주세요."),
            HumanMessage(content=f"이 텍스트를 쉽게 설명해 줘: '{req.text}'. PDF 문맥: {req.pdf_context}")
        ]
        response = await model.ainvoke(messages)
        ai_reply = response.content
        if isinstance(ai_reply, list):
            ai_reply = " ".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in ai_reply])
        elif isinstance(ai_reply, dict):
            ai_reply = str(ai_reply.get("text", ai_reply))
        else:
            ai_reply = str(ai_reply)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"AI API Error: {e}")
        ai_reply = f"AI API 오류 발생: {str(e)}"

    # 3. 대화 세션 기록 및 4. 인터랙션 기록 (DB 에러 무시)
    try:
        await chat_manager.add_message(session_id, "user", req.text)
        await chat_manager.add_message(session_id, "assistant", ai_reply)

        interaction = InteractionCreate(
            class_id=internal_class_id,
            student_id=user["id"],
            page_number=req.page,
            interaction_type="text_drag",
            question_content=req.text,
            ai_response=ai_reply
        )
        await interaction_recorder.record(interaction)
    except Exception as db_e:
        print(f"DB Record Error: {db_e}")

    return {"explanation": ai_reply, "session_id": session_id}

@router.post("/explain-image")
async def explain_image(req: ExplainImageRequest, user: dict = Depends(get_current_user)):
    import config
    class_res = await config.supabase.table("classes").select("id").eq("class_id", req.class_id).execute()

    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    internal_class_id = class_res.data[0]["id"]

    session_id = await chat_manager.create_session(internal_class_id, user["id"], "area_capture", "image_url_placeholder")

    try:
        model = get_chat_model()
        messages = [
            SystemMessage(content="당신은 친절한 AI 조교입니다. 학생이 보낸 이미지를 반드시 '한국어'로, 최대한 쉽고 핵심만 짧게 요약해서 설명해 주세요."),
            HumanMessage(
                content=[
                    {"type": "text", "text": "이 이미지의 내용을 초등학생도 이해할 수 있게 짧고 쉽게 한국어로 설명해 줘."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{req.image_base64}"}}
                ]
            )
        ]
        response = await model.ainvoke(messages)
        ai_reply = response.content
        if isinstance(ai_reply, list):
            ai_reply = " ".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in ai_reply])
        elif isinstance(ai_reply, dict):
            ai_reply = str(ai_reply.get("text", ai_reply))
        else:
            ai_reply = str(ai_reply)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"AI API Vision Error: {e}")
        ai_reply = f"Vision API 오류 발생: {str(e)}"

    try:
        await chat_manager.add_message(session_id, "user", "[영역 캡처 이미지 질문]")
        await chat_manager.add_message(session_id, "assistant", ai_reply)

        interaction = InteractionCreate(
            class_id=internal_class_id,
            student_id=user["id"],
            page_number=req.page,
            interaction_type="area_capture",
            question_content="[Area Capture Image]",
            ai_response=ai_reply,
            image_url="base64_data"
        )
        await interaction_recorder.record(interaction)
    except Exception as db_e:
        print(f"DB Record Error: {db_e}")

    return {"explanation": ai_reply, "session_id": session_id}

@router.post("/chat")
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    # 1. 히스토리 로드
    history = await chat_manager.get_history(req.session_id)
    
    messages = [SystemMessage(content="당신은 친절한 AI 조교입니다. 앞선 대화 문맥을 파악하여 학생의 추가 질문에 반드시 '한국어'로 짧고 쉽게 답변해 주세요.")]
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
            
    messages.append(HumanMessage(content=req.message))

    # 2. AI 호출
    try:
        model = get_chat_model()
        response = await model.ainvoke(messages)
        ai_reply = response.content
        if isinstance(ai_reply, list):
            ai_reply = " ".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in ai_reply])
        elif isinstance(ai_reply, dict):
            ai_reply = str(ai_reply.get("text", ai_reply))
        else:
            ai_reply = str(ai_reply)
    except Exception as e:
        print(f"AI Chat Error: {e}")
        ai_reply = "채팅 응답에 실패했습니다. API 키를 확인해주세요."

    # 3, 4. 메시지 및 상호작용 기록
    try:
        await chat_manager.add_message(req.session_id, "user", req.message)
        await chat_manager.add_message(req.session_id, "assistant", ai_reply)

        import config
        session_data = await config.supabase.table("chat_sessions").select("class_id").eq("id", req.session_id).execute()

        internal_class_id = session_data.data[0]["class_id"] if session_data.data else "unknown_class"

        interaction = InteractionCreate(
            class_id=internal_class_id,
            student_id=user["id"],
            page_number=req.page, # 전달받은 실제 페이지 번호 기록
            interaction_type="follow_up",
            question_content=req.message,
            ai_response=ai_reply
        )

        if internal_class_id != "unknown_class":
            await interaction_recorder.record(interaction)
    except Exception as db_e:
        print(f"DB Record Error: {db_e}")
    
    return {"reply": ai_reply}

