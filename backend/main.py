import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from database import engine, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from auth import create_access_token
from routes.live import router as live_router
from routes.archive import router as archive_router
from routes.simulation import router as simulation_router

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# init db tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="A.R.E.S. Command API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# plug in route modules
app.include_router(live_router)
app.include_router(archive_router)
app.include_router(simulation_router)


# --- SECURITY ROUTE ---
@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    correct_username = os.getenv("ADMIN_USERNAME")
    correct_password = os.getenv("ADMIN_PASSWORD")
    if form_data.username != correct_username or form_data.password != correct_password:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(
        data={"sub": form_data.username, "role": "admin"}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/")
def read_root():
    return {"message": "Space Exploration API is online."}


@app.get("/test-db")
def test_database(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "Success", "message": "Connected to Postgres database."}
    except Exception:
        raise HTTPException(status_code=500, detail="DB connection failed")
