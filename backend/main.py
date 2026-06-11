from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date
from database import get_db_connected
import random 

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Mission(BaseModel):
    name:str
    target_destination:str
    launch_date: Optional[date]=None

@app.get("/")
def read_root():
    return {"message": "Space Exploration API is online."}

@app.get("/test-db")
def test_database():
    conn=get_db_connected()
    if conn and conn.is_connected():
        conn.close()
        return {"status": "Success", "message":"Connected to MySQL space-exploration database."}
    else:
        raise HTTPException(status_code=500, detail="database connection failed.")

@app.get("/missions")
def get_all_missions():
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    
    cursor=conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM missions;")
    missions_data=cursor.fetchall()
    cursor.close()
    conn.close()
    return {"missions": missions_data}

@app.get("/missions/{mission_id}")
def get_mission(mission_id:int):
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    cursor=conn.cursor(dictionary=True)
    sql="SELECT * FROM missions WHERE id= %s;"
    cursor.execute(sql,(mission_id,))
    mission=cursor.fetchone()
    cursor.close()
    conn.close()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found.")
    return mission


@app.post("/missions")
def create_mission(mission: Mission):
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    
    cursor=conn.cursor()
    sql="INSERT INTO missions (name, target_destination, launch_date) VALUES (%s,%s,%s)"
    values=(mission.name,mission.target_destination,mission.launch_date)
    try:
        cursor.execute(sql,values)
        conn.commit()
        new_id=cursor.lastrowid
        return{"message": "Mission created successfully.", "mission_id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/missions/{mission_id}")
def update_mission(mission_id:int, mission: Mission):
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    cursor=conn.cursor()
    sql="UPDATE missions SET name=%s, target_destination=%s, launch_date=%s WHERE id=%s"
    values=(mission.name, mission.target_destination, mission.launch_date, mission_id)
    try:
        cursor.execute(sql,values)
        conn.commit()
        rows_affected=cursor.rowcount
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()  
    if rows_affected==0:
        return {"message":"Mission received, but no text was change."}
    return {"message": f"Mission with id {mission_id} updated successfully."}  

@app.delete("/missions/{mission_id}")
def delete_mission(mission_id:int):
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    cursor=conn.cursor()
    sql="DELETE FROM missions WHERE id=%s"

    try:
        cursor.execute(sql,(mission_id,))
        conn.commit()
        if cursor.rowcount==0:
            raise HTTPException(status_code=404, detail="Mission not found.")
        return{"message": f"Mission with id {mission_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()  
          
@app.get("/missions/{mission_id}/telemetry")
def get_telemetry(mission_id:int):
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    
    cursor=conn.cursor(dictionary=True)
    sql="SELECT * FROM telemetry_logs WHERE mission_id=%s ORDER BY timestamp DESC LIMIT 10;"
    cursor.execute(sql,(mission_id,))
    telemetry_data=cursor.fetchall()
    cursor.close()
    conn.close()
    return {"telemetry": telemetry_data}

@app.post("/missions/{mission_id}/telemetry/simulate")
def simulate_telemetry(mission_id:int):
    conn=get_db_connected()
    if not conn:
        raise HTTPException(status_code=500, detail="database connection failed.")
    
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

    cursor=conn.cursor()
    sql="INSERT INTO telemetry_logs (mission_id, parameter_name, parameter_value, status_level) VALUES (%s,%s,%s,%s)"
    values=(mission_id, param["name"], val, status)
    try:
        cursor.execute(sql,values)
        conn.commit()
        return {"message": "Telemetry ping successful", "sensor": param["name"], "value": val, "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()