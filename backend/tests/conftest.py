import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

# Set env vars BEFORE importing any app modules
os.environ["ADMIN_USERNAME"] = "commander"
os.environ["ADMIN_PASSWORD"] = "deepspace"
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
from sqlalchemy.orm import sessionmaker

# Create a test engine with StaticPool for in-memory SQLite
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

from unittest.mock import patch

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def mock_session_local():
    with patch("routes.simulation.SessionLocal", TestingSessionLocal):
        yield

@pytest.fixture(scope="module", autouse=True)
def setup_database(mock_session_local):
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
