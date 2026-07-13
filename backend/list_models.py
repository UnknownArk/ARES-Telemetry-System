import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    for m in client.models.list():
        if "flash" in m.name or "pro" in m.name:
            print(m.name)
except Exception as e:
    print(str(e))
