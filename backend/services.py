import os
import redis
from dotenv import load_dotenv
from google import genai

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Gemini AI client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in .env")
gemini_client = genai.Client(api_key=api_key)

# Redis connection
try:
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    redis_client.ping()
    print("System: Redis caching layer active.")
except redis.ConnectionError:
    print("System Fatal: Redis server unreachable. Ensure WSL service is running.")
    redis_client = None
