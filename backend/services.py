import os
import redis
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

if os.getenv("APP_ENV") == "test":
    gemini_client = None
    redis_client = None
else:
    from google import genai

    # Gemini AI client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found in .env")
    gemini_client = genai.Client(api_key=api_key)

    # Redis connection
    try:
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_client = redis.Redis(
            host=redis_host,
            port=6379,
            db=0,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        redis_client.ping()
        print("System: Redis caching layer active.")
    except redis.RedisError:
        print("System Fatal: Redis server unreachable. Ensure WSL service is running.")
        redis_client = None
