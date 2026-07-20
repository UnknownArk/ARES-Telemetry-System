from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Date,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    country = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    fleet = relationship(
        "Spacecraft", back_populates="agency", cascade="all,delete-orphan"
    )


class Spacecraft(Base):
    __tablename__ = "spacecrafts"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(
        Integer, ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(100), unique=True, index=True, nullable=False)
    classification = Column(String(50))
    max_crew_capacity = Column(Integer, default=0)

    agency = relationship("Agency", back_populates="fleet")
    missions = relationship("Mission", back_populates="spacecraft")


class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    spacecraft_id = Column(
        Integer, ForeignKey("spacecrafts.id", ondelete="SET NULL"), nullable=True
    )
    external_id = Column(String(100), unique=True, nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    target_destination = Column(String(255), nullable=False)
    status = Column(String(50), default="Planning")
    launch_date = Column(Date)
    objective = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    source_url = Column(String(500), nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )

    # Relationships
    spacecraft = relationship("Spacecraft", back_populates="missions")
    telemetry = relationship(
        "TelemetryLog", back_populates="mission", cascade="all,delete-orphan"
    )
    crew = relationship("Scientist", back_populates="mission")
    result = relationship(
        "MissionResult",
        back_populates="mission",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Scientist(Base):
    __tablename__ = "scientists"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id", ondelete="SET NULL"))
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    specialty = Column(String(150), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    bio = Column(Text)

    mission = relationship("Mission", back_populates="crew")


class MissionResult(Base):
    __tablename__ = "mission_results"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(
        Integer,
        ForeignKey("missions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    outcome = Column(String(50))
    summary = Column(Text)

    mission = relationship("Mission", back_populates="result")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(
        Integer, ForeignKey("missions.id", ondelete="CASCADE"), nullable=False
    )
    parameter_name = Column(String(50), nullable=False)
    parameter_value = Column(Float, nullable=False)
    status_level = Column(String(50), default="Nominal")
    timestamp = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )

    mission = relationship("Mission", back_populates="telemetry")
    __table_args__ = (
        Index("idx_telemetry_mission_timestamp", "mission_id", "timestamp"),
    )
