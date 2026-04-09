import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# .env 파일 로드
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

try:
    if not API_KEY:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        google_api_key=API_KEY
    )
    res = llm.invoke("Hello, say 'Test successful'.")
    print("Success! Response:", res.content)
except Exception as e:
    with open("err_out.txt", "w", encoding="utf-8") as f:
        f.write(str(e))
    print("Error:", e)
