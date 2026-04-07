from config import supabase
from fastapi import HTTPException
from typing import List, Dict

class ChatManager:
    def create_session(self, class_id: str, student_id: str, context_type: str, context_source: str) -> str:
        if supabase is None:
            return "dummy_session_id"
            
        new_session = {
            "class_id": class_id,
            "student_id": student_id,
            "context_type": context_type,
            "context_source": context_source
        }
        res = supabase.table("chat_sessions").insert(new_session).execute()
        if res.data:
            return res.data[0]["id"]
        return "dummy_session_id"

    def add_message(self, session_id: str, role: str, content: str):
        if supabase is None or session_id == "dummy_session_id":
            return
            
        new_message = {
            "session_id": session_id,
            "role": role,
            "content": content
        }
        supabase.table("chat_messages").insert(new_message).execute()

    def get_history(self, session_id: str) -> List[Dict]:
        if supabase is None or session_id == "dummy_session_id":
            return []
            
        res = supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at").execute()
        return res.data

chat_manager = ChatManager()
