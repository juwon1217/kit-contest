import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# .env 파일 로드
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
PROJECT_ID = "kit-gongmo"

print("Testing ChatGoogleGenerativeAI with vertexai=True")
try:
    if not API_KEY:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        google_api_key=API_KEY, 
        project=PROJECT_ID, 
        location="asia-northeast3", # Default to Seoul, can be us-central1
        vertexai=True
    )
    res = llm.invoke("Hello, say 'Test successful'.")
    print("Success! Response:", res.content)
except Exception as e:
    print("Error:", e)
