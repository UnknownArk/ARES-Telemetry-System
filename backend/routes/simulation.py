from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import redis_client
import json
import uuid
from auth import verify_admin
from models import TelemetryLog


router = APIRouter()


class TelemetryPayload(BaseModel):
    mission_id: int
    parameter_name: str
    parameter_value: float
    status_level: str = "Nominal"


# -- high freq pipelines --

@router.get("/telemetry/buffer/status")
def get_buffer_status(admin: dict = Depends(verify_admin)):
    if not redis_client:
        return {"status": "offline", "count": 0}
    try:
        count = redis_client.llen("telemetry_buffer")
        return {"status": "online", "count": count}
    except Exception as e:
        return {"status": "error", "count": 0, "detail": str(e)}


@router.post("/telemetry/stream")
def ingest_telemetry_stream(
    payload: TelemetryPayload, admin: dict = Depends(verify_admin)
):
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis offline.")

    redis_client.rpush("telemetry_buffer", json.dumps(payload.dict()))
    return {"status": "buffered in memory"}


@router.post("/telemetry/flush")
def flush_telemetry_buffer(
    db: Session = Depends(get_db), admin: dict = Depends(verify_admin)
):
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis offline.")

    lock_key = "telemetry_buffer:flush_lock"
    lock_token = str(uuid.uuid4())
    if not redis_client.set(lock_key, lock_token, nx=True, ex=30):
        raise HTTPException(status_code=409, detail="Telemetry flush already in progress.")

    try:
        raw_data = redis_client.lrange("telemetry_buffer", 0, -1)

        if not raw_data:
            return {"message": "Buffer is empty."}

        mappings = []
        for item in raw_data:
            data = json.loads(item)
            mappings.append(
                {
                    "mission_id": data["mission_id"],
                    "parameter_name": data["parameter_name"],
                    "parameter_value": data["parameter_value"],
                    "status_level": data.get("status_level", "Nominal"),
                }
            )

        db.bulk_insert_mappings(TelemetryLog, mappings)
        db.commit()
        # Remove only the items read before this flush; records appended during the flush remain queued.
        redis_client.ltrim("telemetry_buffer", len(raw_data), -1)
        return {"message": f"Successfully flushed {len(mappings)} records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Write failed: " + str(e))
    finally:
        if redis_client.get(lock_key) == lock_token:
            redis_client.delete(lock_key)
