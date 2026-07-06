from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import redis_client
import json
from auth import verify_admin
from models import TelemetryLog


router = APIRouter()

class TelemetryPayload(BaseModel):
    mission_id: int
    parameter_name: str
    parameter_value: float

#-- high freq pipelines --

@router.post("/telemetry/stream")
def ingest_telemetry_stream(payload: TelemetryPayload, admin: dict = Depends(verify_admin)):
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis offline.")

    redis_client.rpush("telemetry_buffer", json.dumps(payload.dict()))
    return {"status": "buffered in memory"}

@router.post("/telemetry/flush")
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