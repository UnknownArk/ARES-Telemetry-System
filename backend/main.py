import os
import requests
import time
import redis
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from datetime import date
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import engine, get_db
import models
from models import Mission as DBMission, TelemetryLog, Scientist, Agency, Spacecraft, MissionResult
from google import genai
from google.genai import types
from auth import create_access_token, verify_admin

#make phy tabels
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="A.R.E.S. Command API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#fucking load please-env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
api_key=os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: API_KEY Not found")
client = genai.Client(api_key=api_key)

# ---Redis Conn---
try:
    redis_client=redis.Redis(host='localhost',port=6379,db=0,decode_responses=True)
    redis_client.ping()
    print("System: Redis caching layer active.")
except redis.ConnectionError:
    print("Sysytem Fatal: Redis server unreachable. Ensure WSL service is running.")
    redis_client=None


# --- PYDANTIC SCHEMAS ---
class MissionCreate(BaseModel):
    name: str
    target_destination: str
    spacecraft_id: Optional[int]= None
    launch_date: Optional[date] = None

class ScientistResponse(BaseModel):
    id: int
    name: str
    role: str
    specialty: str
    email: str
    mission_id: Optional[int]
    bio: Optional[str]

    class Config:
        from_attributes = True

class ScientistCreate(BaseModel):
    name: str
    role: str
    specialty: str
    email: str
    bio: Optional[str] = None

class AgencyCreate(BaseModel):
    name: str
    country: str
    description: Optional[str]= None

class SpacecraftCreate(BaseModel):
    name: str
    classification: str
    agency_id: int
    max_crew_capacity: int=0

class TelemetryPayload(BaseModel):
    mission_id: int
    parameter_name: str
    parameter_value: float

# --- SECURITY ROUTE ---
@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    correct_username = os.getenv("ADMIN_USERNAME")
    correct_password = os.getenv("ADMIN_PASSWORD")
    if form_data.username != correct_username or form_data.password != correct_password:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": form_data.username, "role": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}

#----
#  Live-HuB
#----
@app.get("/live/iss/telemetry")
def fetch_live_iss():
    try:
        response= requests.get("https://api.wheretheiss.at/v1/satellites/25544", timeout=15)
        response.raise_for_status()
        data=response.json()
        return {
            "target": "ISS",
            "altitude_km": round(data["altitude"],2),
            "velocity_kmh": round(data["velocity"], 2),
            "latitude": round(data["latitude"], 4),
            "longitude": round(data["longitude"], 4),
            "status": "LIVE"
        }
    except requests.exceptions.RequestException as e: 
        print(f"System Warning: Live API offline ({e}). Engaging Fail-Safe telemetry.")
        return {
            "target": "ISS",
            "altitude_km": 418.5,
            "velocity_kmh": 27580.2,
            "latitude": 28.5721,
            "longitude": -80.6480,
            "status": "SIMULATED (LIVE OFFLINE)"
        }

@app.post("/live/iss/analyze")
def analyze_live_iss():
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis cache unavailable.")
    #checker
    cached_report= redis_client.get("mission:iss:ai_report")
    if cached_report:
        print("System: Redis Cache HIT. Routing saved response.")
        return{"report": cached_report, "cached": True}
    print("System: Redis Cache Miss. Querying Gemini API...")

    telemetry= fetch_live_iss()
    prompt = f"""
    You are the AI Flight Director for A.R.E.S. 
    Analyze this live telemetry for the International Space Station:
    Altitude: {telemetry['altitude_km']} kmkkkkkks
    Velocity: {telemetry['velocity_kmh']} km/h
    Location: Lat {telemetry['latitude']}, Lon {telemetry['longitude']}
    
    Provide a concise, 2-paragraph diagnostic report in Markdown. 
    End with [STATUS: NOMINAL] or [STATUS: WARNING].
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        redis_client.setex("mission:iss:ai_report",900,response.text) #900=15 min
        return {"report": response.text, "cached": False}
    except Exception as e:
        print(f"--- AI EXECUTION FAILURE ---\n{str(e)}\n----------------------")
        raise HTTPException(status_code=500, detail="AI Diagnostics failed.")


#----
# Mission DBs
#----

# --- PUBLIC ROUTES ---
@app.get("/")
def read_root():
    return {"message": "Space Exploration API is online."}

@app.get("/test-db")
def test_database(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "Success", "message": "Connected to Postgres database."}
    except:
        raise HTTPException(status_code=500, detail="DB connection failed")

@app.get("/missions")
def get_all_missions(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DBMission)
    if search:
        query = query.filter(DBMission.name.ilike(f"%{search}%"))
    missions = query.all()
    return {"missions": missions}

@app.get("/missions/{mission_id}")
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found.")
    return mission

@app.get("/missions/{mission_id}/telemetry")
def get_telemetry(mission_id: int, db: Session = Depends(get_db)):
    telemetry_data = db.query(TelemetryLog).filter(TelemetryLog.mission_id == mission_id).order_by(TelemetryLog.timestamp.desc()).limit(10).all()
    return {"telemetry": telemetry_data}

@app.get("/missions/{mission_id}/crew", response_model=list[ScientistResponse])
def get_mission_crew(mission_id: int, db: Session = Depends(get_db)):
    crew = db.query(Scientist).filter(Scientist.mission_id == mission_id).all()
    return crew

@app.get("/agencies")
def get_all_agencies(db: Session = Depends(get_db)):
    agencies = db.query(Agency).all()
    return {"agencies": agencies}

@app.get("/spacecrafts")
def get_all_spacecrafts(db: Session = Depends(get_db)):
    spacecrafts = db.query(Spacecraft).all()
    return {"spacecrafts": spacecrafts}

# --- PROTECTED ADMIN ROUTES ---
@app.post("/missions")
def create_mission(mission: MissionCreate, db: Session = Depends(get_db), admin: dict = Depends(verify_admin)):
    new_mission = DBMission(
        name=mission.name,
        target_destination=mission.target_destination,
        spacecraft_id=mission.spacecraft_id,
        launch_date=mission.launch_date
    )
    db.add(new_mission)
    try:
        db.commit()
        db.refresh(new_mission)
        return {"message": "Mission Created Successfully", "mission_id": new_mission.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/missions/{mission_id}")
def update_mission(mission_id: int, mission: MissionCreate, db: Session = Depends(get_db), admin: dict = Depends(verify_admin)):
    db_mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not db_mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    db_mission.name = mission.name
    db_mission.target_destination = mission.target_destination
    db_mission.launch_date = mission.launch_date
    db_mission.spacecraft_id = mission.spacecraft_id

    try:
        db.commit()
        return {"message": f"Mission with {mission_id} updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/missions/{mission_id}")
def delete_mission(mission_id: int, db: Session = Depends(get_db), admin: dict = Depends(verify_admin)):
    db_mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not db_mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    try:
        db.delete(db_mission)
        db.commit()
        return {"message": f"Mission with id {mission_id} is Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/missions/{mission_id}/crew")
def add_crew_member(mission_id: int, scientist: ScientistCreate, db: Session = Depends(get_db), admin: dict = Depends(verify_admin)):
    new_scientist = Scientist(
        name=scientist.name,
        role=scientist.role,
        specialty=scientist.specialty,
        email=scientist.email,
        bio=scientist.bio,
        mission_id=mission_id
    )
    db.add(new_scientist)
    try:
        db.commit()
        return {"message": f"Successfully assigned {scientist.name} to mission: {mission_id}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error saving Crew Member: " + str(e))

@app.post("/agencies")
def create_agency(agency: AgencyCreate, db: Session= Depends(get_db), admin: dict= Depends(verify_admin)):
    new_agency= Agency(
        name= agency.name,
        country=agency.country,
        description= agency.description
    )
    db.add(new_agency)
    try:
        db.commit()
        db.refresh(new_agency)
        return{"message": "Agency registered", "agency_id": new_agency.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/spacecraft")
def create_spacecraft(spacecraft: SpacecraftCreate, db: Session= Depends(get_db), admin: dict= Depends(verify_admin)):
    new_spacecraft= Spacecraft(
        name=spacecraft.name,
        classification=spacecraft.classification,
        agency_id=spacecraft.agency_id,
        max_crew_capacity=spacecraft.max_crew_capacity
    )
    db.add(new_spacecraft)
    try:
        db.commit()
        db.refresh(new_spacecraft)
        return{"message": "Spacecraft registered to fleet", "spacecraft_id": new_spacecraft.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ensure the agency_id exists. "+str(e))
    
# --- HIGH FREQUENCY INGESTION PIPELINE ---

@app.post("/telemetry/stream")
def ingest_telemetry_stream(payload: TelemetryPayload):
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis offline.")
    
    redis_client.rpush("telemetry_buffer", json.dumps(payload.dict()))
    return {"status": "buffered in memory"}

@app.post("/telemetry/flush")
def flush_telemetry_buffer(db: Session = Depends(get_db), admin: dict = Depends(verify_admin)):
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis offline.")

    pipeline = redis_client.pipeline()
    pipeline.lrange("telemetry_buffer", 0, -1)
    pipeline.delete("telemetry_buffer")
    results = pipeline.execute()

    raw_data = results[0]
    if not raw_data:
        return {"message": "Buffer is empty."}

    mappings = []
    for item in raw_data:
        data = json.loads(item)
        mappings.append({
            "mission_id": data["mission_id"],
            "parameter_name": data["parameter_name"],
            "parameter_value": data["parameter_value"]
        })

    try:
        db.bulk_insert_mappings(TelemetryLog, mappings)
        db.commit()
        return {"message": f"Successfully flushed {len(mappings)} records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Write failed: " + str(e))