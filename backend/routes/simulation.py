from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import redis_client
import json
import uuid
from auth import verify_admin
from models import TelemetryLog
from collections import Counter
from database import SessionLocal

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)



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


def process_telemetry_batch():
    if not redis_client:
        return {"error": "Redis offline."}

    lock_key = "telemetry_buffer:flush_lock"
    lock_token = str(uuid.uuid4())
    if not redis_client.set(lock_key, lock_token, nx=True, ex=30):
        return {"error": "Flush already in progress"}

    db = SessionLocal()
    try:
        raw_data = redis_client.lrange("telemetry_buffer", 0, -1)

        if not raw_data:
            return {"message": "Buffer is empty."}

        mappings = []
        counts = {"Nominal": 0, "Warning": 0, "Critical": 0}
        risk_params = Counter()

        for item in raw_data:
            data = json.loads(item)
            status = data.get("status_level", "Nominal")
            mappings.append(
                {
                    "mission_id": data["mission_id"],
                    "parameter_name": data["parameter_name"],
                    "parameter_value": data["parameter_value"],
                    "status_level": status,
                }
            )

            if status in counts:
                counts[status] += 1
            else:
                counts["Nominal"] += 1

            if status in ["Warning", "Critical"]:
                risk_params[data["parameter_name"]] += 1

        db.bulk_insert_mappings(TelemetryLog, mappings)
        db.commit()
        # Remove only the items read before this flush; records appended during the flush remain queued.
        redis_client.ltrim("telemetry_buffer", len(raw_data), -1)

        primary_risk = risk_params.most_common(1)[0][0] if risk_params else "None"

        return {
            "message": f"Successfully flushed {len(mappings)} records.",
            "flushed": len(mappings),
            "nominal": counts["Nominal"],
            "warning": counts["Warning"],
            "critical": counts["Critical"],
            "primary_risk": primary_risk,
        }
    except Exception as e:
        db.rollback()
        return {"error": "Write failed: " + str(e)}
    finally:
        db.close()
        if redis_client.get(lock_key) == lock_token:
            redis_client.delete(lock_key)

@router.post("/telemetry/flush")
def flush_telemetry_buffer(
    admin: dict = Depends(verify_admin)
):
    result = process_telemetry_batch()
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
