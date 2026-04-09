from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import config
from config import ERROR_MAP
from supabase import acreate_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시 Supabase 클라이언트 초기화
    config.supabase = await acreate_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    yield
    # 종료 시 필요하다면 정리 로직 추가 가능

app = FastAPI(title="Edu-Lens AI Platform API", lifespan=lifespan)



# CORS Middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handler for Custom Errors
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    # 만약 exc.detail이 ERROR_MAP에 있는 코드라면 (커스텀 에러 처리)
    if isinstance(exc.detail, str) and exc.detail in ERROR_MAP:
        status_code, message = ERROR_MAP[exc.detail]
        return JSONResponse(
            status_code=status_code,
            content={"error": exc.detail, "message": message, "detail": None}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "HTTP_EXCEPTION", "message": str(exc.detail), "detail": None}
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to Edu-Lens AI API"}

from auth_module import router as auth_router
from class_manager import router as class_router
from ai_engine import router as ai_router
from quiz_router import router as quiz_router_api
from report_router import router as report_router_api

app.include_router(auth_router)
app.include_router(class_router)
app.include_router(ai_router)
app.include_router(quiz_router_api)
app.include_router(report_router_api)
