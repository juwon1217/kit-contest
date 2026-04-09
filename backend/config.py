import os
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import acreate_client, AsyncClient

load_dotenv()

# 환경 변수에서 Supabase URL 및 Key 가져오기 (빈칸 처리 가능하도록 .env 활용)
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL_HERE")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "YOUR_SUPABASE_SERVICE_KEY_HERE")

# 전역 비동기 클라이언트 인스턴스 (main.py의 lifespan에서 초기화됨)
supabase: AsyncClient = None


# 공통 에러 응답 포맷
class ErrorResponse(BaseModel):
    error: str
    message: str
    detail: str | None = None

# 공통 에러 매핑
ERROR_MAP = {
    "INVALID_CLASS_ID": (400, "유효하지 않은 수업 코드입니다."),
    "CLASS_ENDED": (410, "이미 종료된 수업입니다."),
    "UNAUTHORIZED": (401, "인증이 필요합니다."),
    "FORBIDDEN": (403, "권한이 없습니다."),
    "AI_TIMEOUT": (504, "AI 서비스 응답 시간이 초과되었습니다."),
    "PDF_UPLOAD_FAILED": (500, "PDF 업로드에 실패했습니다."),
    "QUIZ_NOT_READY": (404, "퀴즈가 아직 생성되지 않았습니다."),
}
