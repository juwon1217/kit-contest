import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print(f"URL: {SUPABASE_URL}")
print(f"KEY: {SUPABASE_KEY}")
try:
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
