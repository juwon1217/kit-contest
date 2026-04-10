import config

from fastapi import HTTPException
from typing import List, Dict

class ChatManager:
    async def create_session(self, class_id: str, student_id: str, context_type: str, context_source: str) -> str:
        if config.supabase is None:
            return "dummy_session_id"
            
        new_session = {
            "class_id": class_id,
            "student_id": student_id,
            "context_type": context_type,
            "context_source": context_source
        }
        res = await config.supabase.table("chat_sessions").insert(new_session).execute()
        if res.data:
            return res.data[0]["id"]
        return "dummy_session_id"

    async def add_message(self, session_id: str, role: str, content: str):
        if config.supabase is None or "dummy" in session_id:
            return
            
        new_message = {
            "session_id": session_id,
            "role": role,
            "content": content
        }
        await config.supabase.table("chat_messages").insert(new_message).execute()

    async def get_history(self, session_id: str) -> List[Dict]:
        if config.supabase is None or "dummy" in session_id:
            return []
            
        res = await config.supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at").execute()
        return res.data



chat_manager = ChatManager()
