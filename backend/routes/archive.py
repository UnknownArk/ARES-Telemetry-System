from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Mission as DBMission, TelemetryLog, Scientist, Agency, Spacecraft
from auth import verify_admin
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date

router = APIRouter()


# --- PYDANTIC SCHEMAS ---
class MissionCreate(BaseModel):
    name: str
    target_destination: str
    spacecraft_id: Optional[int] = None
    launch_date: Optional[date] = None
    status: Optional[str] = "Planning"
    objective: Optional[str] = None


class ScientistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    specialty: str
    email: str
    mission_id: Optional[int]
    bio: Optional[str]


class ScientistCreate(BaseModel):
    name: str
    role: str
    specialty: str
    email: str
    bio: Optional[str] = None


class AgencyCreate(BaseModel):
    name: str
    country: str
    description: Optional[str] = None


class SpacecraftCreate(BaseModel):
    name: str
    classification: str
    agency_id: int
    max_crew_capacity: int = 0


# ----
# Mission DBs
# ----

# --- PUBLIC ROUTES ---


@router.get("/missions")
def get_all_missions(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DBMission)
    if search:
        query = query.filter(DBMission.name.ilike(f"%{search}%"))
    missions = query.all()
    return {"missions": missions}


@router.get("/missions/{mission_id}")
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found.")
    return mission


@router.get("/missions/{mission_id}/telemetry")
def get_telemetry(mission_id: int, db: Session = Depends(get_db)):
    telemetry_data = (
        db.query(TelemetryLog)
        .filter(TelemetryLog.mission_id == mission_id)
        .order_by(TelemetryLog.timestamp.desc())
        .limit(10)
        .all()
    )
    return {"telemetry": telemetry_data}


@router.get("/missions/{mission_id}/crew", response_model=list[ScientistResponse])
def get_mission_crew(mission_id: int, db: Session = Depends(get_db)):
    crew = db.query(Scientist).filter(Scientist.mission_id == mission_id).all()
    return crew


@router.get("/agencies")
def get_all_agencies(db: Session = Depends(get_db)):
    agencies = db.query(Agency).all()
    return {"agencies": agencies}


@router.get("/spacecrafts")
def get_all_spacecrafts(db: Session = Depends(get_db)):
    spacecrafts = db.query(Spacecraft).all()
    return {"spacecrafts": spacecrafts}


# --- PROTECTED ADMIN ROUTES ---
@router.post("/missions")
def create_mission(
    mission: MissionCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    new_mission = DBMission(
        name=mission.name,
        target_destination=mission.target_destination,
        spacecraft_id=mission.spacecraft_id,
        launch_date=mission.launch_date,
        status=mission.status,
        objective=mission.objective,
    )
    db.add(new_mission)
    try:
        db.commit()
        db.refresh(new_mission)
        return {"message": "Mission Created Successfully", "mission_id": new_mission.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/missions/{mission_id}")
def update_mission(
    mission_id: int,
    mission: MissionCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    db_mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not db_mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    db_mission.name = mission.name
    db_mission.target_destination = mission.target_destination
    db_mission.launch_date = mission.launch_date
    db_mission.spacecraft_id = mission.spacecraft_id
    db_mission.status = mission.status
    db_mission.objective = mission.objective

    try:
        db.commit()
        return {"message": f"Mission with {mission_id} updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/missions/{mission_id}")
def delete_mission(
    mission_id: int, db: Session = Depends(get_db), admin: dict = Depends(verify_admin)
):
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


@router.post("/missions/{mission_id}/crew")
def add_crew_member(
    mission_id: int,
    scientist: ScientistCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    new_scientist = Scientist(
        name=scientist.name,
        role=scientist.role,
        specialty=scientist.specialty,
        email=scientist.email,
        bio=scientist.bio,
        mission_id=mission_id,
    )
    db.add(new_scientist)
    try:
        db.commit()
        return {
            "message": f"Successfully assigned {scientist.name} to mission: {mission_id}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Error saving Crew Member: " + str(e)
        )


@router.post("/agencies")
def create_agency(
    agency: AgencyCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    new_agency = Agency(
        name=agency.name, country=agency.country, description=agency.description
    )
    db.add(new_agency)
    try:
        db.commit()
        db.refresh(new_agency)
        return {"message": "Agency registered", "agency_id": new_agency.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/spacecraft")
def create_spacecraft(
    spacecraft: SpacecraftCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    new_spacecraft = Spacecraft(
        name=spacecraft.name,
        classification=spacecraft.classification,
        agency_id=spacecraft.agency_id,
        max_crew_capacity=spacecraft.max_crew_capacity,
    )
    db.add(new_spacecraft)
    try:
        db.commit()
        db.refresh(new_spacecraft)
        return {
            "message": "Spacecraft registered to fleet",
            "spacecraft_id": new_spacecraft.id,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Ensure the agency_id exists. " + str(e)
        )
