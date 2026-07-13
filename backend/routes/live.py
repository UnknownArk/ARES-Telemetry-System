import requests
from fastapi import APIRouter, HTTPException, Request
from services import redis_client, gemini_client

router = APIRouter()


# --- Live ISS Tracking ---
@router.get("/live/iss/telemetry")
def fetch_live_iss():
    try:
        response = requests.get(
            "https://api.wheretheiss.at/v1/satellites/25544", timeout=15
        )
        response.raise_for_status()
        data = response.json()
        return {
            "target": "ISS",
            "altitude_km": round(data["altitude"], 2),
            "velocity_kmh": round(data["velocity"], 2),
            "latitude": round(data["latitude"], 4),
            "longitude": round(data["longitude"], 4),
            "status": "LIVE",
        }
    except requests.exceptions.RequestException as e:
        print(f"System Warning: Live API offline ({e}). Engaging Fail-Safe telemetry.")
        return {
            "target": "ISS",
            "altitude_km": 418.5,
            "velocity_kmh": 27580.2,
            "latitude": 28.5721,
            "longitude": -80.6480,
            "status": "SIMULATED (LIVE OFFLINE)",
        }




# --- AI Flight Director ---
@router.post("/live/iss/analyze")
def analyze_live_iss(request: Request):
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis cache unavailable.")

    # IP-based Rate Limiting (max 3 requests per minute per IP)
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"rate_limit:analyze:{client_ip}"
    
    requests_made = redis_client.incr(rate_limit_key)
    if requests_made == 1:
        redis_client.expire(rate_limit_key, 60)
        
    if requests_made > 3:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait 1 minute.")
    # check cache first
    cached_report = redis_client.get("mission:iss:ai_report")
    if cached_report:
        print("System: Redis Cache HIT. Routing saved response.")
        return {"report": cached_report, "cached": True}
    print("System: Redis Cache Miss. Querying Gemini API...")

    telemetry = fetch_live_iss()
    prompt = f"""
    You are the AI Flight Director for A.R.E.S. 
    Analyze this live telemetry for the International Space Station:
    Altitude: {telemetry["altitude_km"]} km
    Velocity: {telemetry["velocity_kmh"]} km/h
    Location: Lat {telemetry["latitude"]}, Lon {telemetry["longitude"]}
    
    Provide a concise, 2-paragraph diagnostic report in Markdown. 
    End with [STATUS: NOMINAL] or [STATUS: WARNING].
    """

    try:
        response = gemini_client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
        )
        redis_client.setex("mission:iss:ai_report", 900, response.text)  # 900=15 min
        return {"report": response.text, "cached": False}
    except Exception as e:
        error_msg = str(e)
        print(f"--- AI EXECUTION FAILURE ---\n{error_msg}\n----------------------")
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail="AI Rate Limit Exceeded. Please wait 15 seconds.")
        raise HTTPException(status_code=500, detail="AI Diagnostics failed.")
