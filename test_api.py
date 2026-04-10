import requests

# Test POST request to /api/ai/chat
url = "http://127.0.0.1:8000/api/ai/chat"

payload = {
    "session_id": "dummy_session",
    "message": "안녕?",
    "page": 1,
    "class_id": "AXXCC6" # User showed AXXCC6 as an example class ID earlier
}

# we need an auth token for user depending on get_current_user
# wait, I don't have a valid auth token easily.
