from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Mission as DBMission, TelemetryLog, Scientist, Agency, Spacecraft
from auth import verify_admin
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
from sqlalchemy import extract, or_

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
def get_all_missions(
    search: Optional[str] = None,
    status: Optional[str] = None,
    agency: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(DBMission).outerjoin(Spacecraft).outerjoin(Agency)
    if search:
        query = query.filter(
            or_(
                DBMission.name.ilike(f"%{search}%"),
                DBMission.objective.ilike(f"%{search}%"),
                DBMission.target_destination.ilike(f"%{search}%"),
                Agency.name.ilike(f"%{search}%"),
            )
        )
    if status:
        query = query.filter(DBMission.status.ilike(f"{status}"))
    if agency:
        query = query.filter(Agency.name.ilike(f"%{agency}%"))
    if year:
        query = query.filter(extract("year", DBMission.launch_date) == year)

    query = query.order_by(DBMission.launch_date.desc().nulls_last())
    missions = query.limit(limit).all()

    result = []
    for m in missions:
        m_dict = {
            "id": m.id,
            "external_id": m.external_id,
            "name": m.name,
            "target_destination": m.target_destination,
            "status": m.status,
            "launch_date": str(m.launch_date) if m.launch_date is not None else None,
            "objective": m.objective,
            "image_url": m.image_url,
            "source_url": m.source_url,
            "agency_name": m.spacecraft.agency.name
            if m.spacecraft and m.spacecraft.agency
            else "Unknown Agency",
        }
        result.append(m_dict)

    return {"missions": result}


@router.get("/missions/{mission_id}")
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found.")
    return mission


@router.get("/missions/{mission_id}/telemetry")
def get_telemetry(
    mission_id: int,
    limit: int = 10,
    anomaly_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(TelemetryLog).filter(TelemetryLog.mission_id == mission_id)

    if anomaly_only:
        query = query.filter(TelemetryLog.status_level != "Nominal")

    telemetry_data = query.order_by(TelemetryLog.timestamp.desc()).limit(limit).all()
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
@router.post("/missions", dependencies=[Depends(verify_admin)])
def create_mission(
    mission: MissionCreate,
    db: Session = Depends(get_db),
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


@router.put("/missions/{mission_id}", dependencies=[Depends(verify_admin)])
def update_mission(
    mission_id: int,
    mission: MissionCreate,
    db: Session = Depends(get_db),
):
    db_mission = db.query(DBMission).filter(DBMission.id == mission_id).first()
    if not db_mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    for key, value in mission.model_dump().items():
        setattr(db_mission, key, value)

    try:
        db.commit()
        return {"message": f"Mission with {mission_id} updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/missions/{mission_id}", dependencies=[Depends(verify_admin)])
def delete_mission(
    mission_id: int, db: Session = Depends(get_db)
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


@router.post("/missions/{mission_id}/crew", dependencies=[Depends(verify_admin)])
def add_crew_member(
    mission_id: int,
    scientist: ScientistCreate,
    db: Session = Depends(get_db),
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


@router.post("/agencies", dependencies=[Depends(verify_admin)])
def create_agency(
    agency: AgencyCreate,
    db: Session = Depends(get_db),
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


@router.post("/spacecraft", dependencies=[Depends(verify_admin)])
def create_spacecraft(
    spacecraft: SpacecraftCreate,
    db: Session = Depends(get_db),
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
