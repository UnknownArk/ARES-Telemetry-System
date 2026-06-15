from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models import Mission as DBMission, TelemetryLog, Scientist
import random 

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MissionCreate(BaseModel):
    name:str
    target_destination:str
    launch_date: Optional[date]=None

class ScientistResponse(BaseModel):
    id:int
    name:str
    role:str
    specialty:str
    email:str
    mission_id:Optional[int]
    bio:Optional[str]

    class Config:
        from_attributes=True

class ScientistCreate(BaseModel):
    name:str
    role:str
    specialty:str
    email:str
    bio: Optional[str]=None


@app.get("/")
def read_root():
    return {"message": "Space Exploration API is online."}

@app.get("/test-db")
def test_database(db: Session=Depends(get_db)):
   try:
       db.execute(text("SELECT 1"))
       return {"status":"Success","message":"Connected to Mysql database."}
   except:
       raise HTTPException(status_code=500, detail="DB connection failed")

@app.get("/missions")
def get_all_missions(search: Optional[str]=None,db: Session=Depends(get_db)):
    query=db.query(DBMission)
    if search:
        query=query.filter(DBMission.name.ilike(f"%{search}%"))

    missions=query.all()
    return {"missions": missions}

@app.get("/missions/{mission_id}")
def get_mission(mission_id:int,db: Session=Depends(get_db)):
    mission=db.query(DBMission).filter(DBMission.id == mission.id).first()
    if not mission:
        raise HTTPException(status_code=404,detail="Mission not found.")
    return mission

@app.post("/missions")
def create_mission(mission: MissionCreate,db: Session=Depends(get_db)):
    new_mission=DBMission(
        name=mission.name,
        target_destiniation=mission.target_destination,
        launch_date=mission.launch_date
    )
    db.add(new_mission)
    try:
        db.commit()
        db.refresh(new_mission)
        return{"message":"Mission Created Successfully","mission_id":new_mission.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,detail=str(e))

@app.put("/missions/{mission_id}")
def update_mission(mission_id:int, mission: MissionCreate,db: Session=Depends(get_db)):
    db_mission=db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not db_mission:
        raise HTTPException(status_code=404,detail="Mission not found")
    db_mission.name=mission.name
    db_mission.target_destination=mission.target_destination
    db_mission.launch_date=mission.launch_date

    try:
        db.commit()
        return{"message":f"Mission with {mission_id} updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,detail=str(e))

@app.delete("/missions/{mission_id}")
def delete_mission(mission_id:int,db: Session=Depends(get_db)):
    db_mission= db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not db_mission:
        raise HTTPException(status_code=404,detail="Mission not found")
    try:
        db.delete(db_mission)
        db.commit()
        return{"message":f"Mission with id {mission_id} is Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,detail=str(e))
          
@app.get("/missions/{mission_id}/telemetry")
def get_telemetry(mission_id:int,db: Session = Depends(get_db)):
    telemetry_data=db.query(TelemetryLog).filter(TelemetryLog.mission_id==mission_id).order_by(TelemetryLog.timestamp.desc()).limit(10).all()
    return {"telemetry":telemetry_data}

@app.post("/missions/{mission_id}/telemetry/simulate")
def simulate_telemetry(mission_id:int,db: Session = Depends(get_db)):
    parameters=[
        {"name": "Fuel Level (%)", "min": 5, "max": 100},
        {"name": "Velocity (km/h)", "min": 15000, "max": 28000},
        {"name": "Oxygen Pressure (psi)", "min": 11.0, "max": 15.0}
    ]
    param=random.choice(parameters)
    val=round(random.uniform(param["min"],param["max"]))
    status="Nominal"
    if param["name"]=="Fuel Level (%)" and val<20:
        status="Critical"
    elif param["name"]=="Oxygen Pressure (psi)" and val<12:
        status="Warning"

    new_log=TelemetryLog(
        mission_id=mission_id,
        parameter_name=param["name"],
        parameter_value=val,
        status_level=status
    )
    db.add(new_log)
    try:
        db.commit()
        return {"message": "Telemetry ping successful", "sensor": param["name"], "value": val, "status": status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/missions/{mission_id}/crew",response_model=list[ScientistResponse])
def get_mission_crew(mission_id:int,db:Session=Depends(get_db)):
    crew=db.query(Scientist).filter(Scientist.mission_id==mission_id).all()
    return crew

@app.post("/missions/{mission_id}/crew")
def add_crew_member(mission_id:int, scientist: ScientistCreate, db: Session=Depends(get_db)):
    new_scientist=Scientist(
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
        return{"message":f"Successfully assigned {scientist.name} to mission: {mission_id}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,detail="Error saving Crew Member: "+str(e))