from config import supabase
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional

class InteractionCreate(BaseModel):
    class_id: str
    student_id: str
    page_number: int
    interaction_type: str # "text_drag", "area_capture", "follow_up"
    question_content: str
    ai_response: Optional[str] = None
    image_url: Optional[str] = None

class InteractionRecorder:
    def record(self, interaction: InteractionCreate):
        if supabase is None:
            raise HTTPException(status_code=500, detail="SUPABASE_NOT_CONFIGURED")

        # 1. interactions 테이블에 기록
        new_interaction = interaction.dict()
        inserted = supabase.table("interactions").insert(new_interaction).execute()
        
        # 2. class_students 테이블의 total_questions 카운트 업
        # supabase rpc 나 select 후 update 방식
        student_record = supabase.table("class_students").select("*").eq("class_id", interaction.class_id).eq("student_id", interaction.student_id).execute()
        
        if student_record.data:
            current_count = student_record.data[0].get("total_questions", 0)
            supabase.table("class_students").update({"total_questions": current_count + 1}).eq("id", student_record.data[0]["id"]).execute()
            
        return inserted.data[0] if inserted.data else None

    def get_page_heatmap(self, class_id: str):
        if supabase is None:
            return []
            
        res = supabase.table("interactions").select("page_number").eq("class_id", class_id).execute()
        
        counts = {}
        for row in res.data:
            page = row["page_number"]
            counts[page] = counts.get(page, 0) + 1
            
        max_cnt = max(counts.values()) if counts else 1
        
        heatmap_data = []
        for page, count in counts.items():
            heatmap_data.append({
                "page": page,
                "questionCount": count,
                "intensity": count / max_cnt
            })
            
        return heatmap_data

    def get_hot_pages(self, class_id: str, top_n: int = 5):
        heatmap = self.get_page_heatmap(class_id)
        sorted_pages = sorted(heatmap, key=lambda x: x["questionCount"], reverse=True)
        return [item["page"] for item in sorted_pages[:top_n]]

interaction_recorder = InteractionRecorder()
