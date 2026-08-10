import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models


def seed_database():
    db: Session = SessionLocal()

    try:
        # Create Tables
        models.Base.metadata.create_all(bind=engine)

        # 1. Agencies
        agencies_data = [
            {
                "name": "NASA",
                "country": "USA",
                "description": "National Aeronautics and Space Administration",
            },
            {
                "name": "ESA",
                "country": "Europe",
                "description": "European Space Agency",
            },
            {
                "name": "ISRO",
                "country": "India",
                "description": "Indian Space Research Organisation",
            },
            {
                "name": "Roscosmos",
                "country": "Russia",
                "description": "State Space Corporation Roscosmos",
            },
            {
                "name": "CNSA",
                "country": "China",
                "description": "China National Space Administration",
            },
        ]

        db_agencies = {}
        for a in agencies_data:
            existing = (
                db.query(models.Agency).filter(models.Agency.name == a["name"]).first()
            )
            if not existing:
                new_agency = models.Agency(**a)
                db.add(new_agency)
                db.commit()
                db.refresh(new_agency)
                db_agencies[a["name"]] = new_agency
            else:
                db_agencies[a["name"]] = existing

        # 2. Spacecrafts
        spacecrafts_data = [
            {
                "name": "Apollo CSM",
                "classification": "Crewed",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 3,
            },
            {
                "name": "Voyager Probe",
                "classification": "Deep Space Probe",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "JWST",
                "classification": "Space Telescope",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Perseverance Rover",
                "classification": "Rover",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Sputnik Satellite",
                "classification": "Satellite",
                "agency_id": db_agencies["Roscosmos"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Hubble",
                "classification": "Space Telescope",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Orion",
                "classification": "Crewed",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 4,
            },
            {
                "name": "Cassini",
                "classification": "Probe",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Parker Probe",
                "classification": "Solar Probe",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Vikram Lander",
                "classification": "Lander",
                "agency_id": db_agencies["ISRO"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Mangalyaan Orbiter",
                "classification": "Orbiter",
                "agency_id": db_agencies["ISRO"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "ISS",
                "classification": "Space Station",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 7,
            },
            {
                "name": "New Horizons",
                "classification": "Deep Space Probe",
                "agency_id": db_agencies["NASA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Rosetta",
                "classification": "Probe",
                "agency_id": db_agencies["ESA"].id,
                "max_crew_capacity": 0,
            },
            {
                "name": "Tiangong",
                "classification": "Space Station",
                "agency_id": db_agencies["CNSA"].id,
                "max_crew_capacity": 3,
            },
        ]

        db_spacecrafts = {}
        for s in spacecrafts_data:
            existing = (
                db.query(models.Spacecraft)
                .filter(models.Spacecraft.name == s["name"])
                .first()
            )
            if not existing:
                new_sc = models.Spacecraft(**s)
                db.add(new_sc)
                db.commit()
                db.refresh(new_sc)
                db_spacecrafts[s["name"]] = new_sc
            else:
                db_spacecrafts[s["name"]] = existing

        # 3. Missions
        missions_data = [
            {
                "name": "Apollo 11",
                "target_destination": "Moon",
                "status": "ARCHIVED",
                "launch_date": datetime.date(1969, 7, 16),
                "objective": "First manned moon landing.",
                "spacecraft_id": db_spacecrafts["Apollo CSM"].id,
            },
            {
                "name": "Voyager 1",
                "target_destination": "Interstellar Space",
                "status": "ACTIVE",
                "launch_date": datetime.date(1977, 9, 5),
                "objective": "Study outer solar system and beyond.",
                "spacecraft_id": db_spacecrafts["Voyager Probe"].id,
            },
            {
                "name": "James Webb Space Telescope",
                "target_destination": "L2 Lagrange Point",
                "status": "ACTIVE",
                "launch_date": datetime.date(2021, 12, 25),
                "objective": "Observe the first galaxies and exoplanets.",
                "spacecraft_id": db_spacecrafts["JWST"].id,
            },
            {
                "name": "Mars Perseverance",
                "target_destination": "Mars (Jezero Crater)",
                "status": "ACTIVE",
                "launch_date": datetime.date(2020, 7, 30),
                "objective": "Seek signs of ancient life and collect samples.",
                "spacecraft_id": db_spacecrafts["Perseverance Rover"].id,
            },
            {
                "name": "Sputnik 1",
                "target_destination": "Low Earth Orbit",
                "status": "ARCHIVED",
                "launch_date": datetime.date(1957, 10, 4),
                "objective": "First artificial Earth satellite.",
                "spacecraft_id": db_spacecrafts["Sputnik Satellite"].id,
            },
            {
                "name": "Hubble Space Telescope",
                "target_destination": "Low Earth Orbit",
                "status": "ACTIVE",
                "launch_date": datetime.date(1990, 4, 24),
                "objective": "Deep space optical and ultraviolet observation.",
                "spacecraft_id": db_spacecrafts["Hubble"].id,
            },
            {
                "name": "Artemis I",
                "target_destination": "Lunar Orbit",
                "status": "ARCHIVED",
                "launch_date": datetime.date(2022, 11, 16),
                "objective": "Uncrewed test of SLS and Orion for lunar return.",
                "spacecraft_id": db_spacecrafts["Orion"].id,
            },
            {
                "name": "Cassini-Huygens",
                "target_destination": "Saturn",
                "status": "ARCHIVED",
                "launch_date": datetime.date(1997, 10, 15),
                "objective": "Study the Saturnian system.",
                "spacecraft_id": db_spacecrafts["Cassini"].id,
            },
            {
                "name": "Parker Solar Probe",
                "target_destination": "Sun",
                "status": "ACTIVE",
                "launch_date": datetime.date(2018, 8, 12),
                "objective": "Study the outer corona of the Sun.",
                "spacecraft_id": db_spacecrafts["Parker Probe"].id,
            },
            {
                "name": "Chandrayaan-3",
                "target_destination": "Moon (Lunar South Pole)",
                "status": "ARCHIVED",
                "launch_date": datetime.date(2023, 7, 14),
                "objective": "Soft landing and rover exploration on the lunar south pole.",
                "spacecraft_id": db_spacecrafts["Vikram Lander"].id,
            },
            {
                "name": "Mangalyaan",
                "target_destination": "Mars Orbit",
                "status": "ARCHIVED",
                "launch_date": datetime.date(2013, 11, 5),
                "objective": "Demonstrate interplanetary technologies and study Martian atmosphere.",
                "spacecraft_id": db_spacecrafts["Mangalyaan Orbiter"].id,
            },
            {
                "name": "ISS Expedition",
                "target_destination": "Low Earth Orbit",
                "status": "ACTIVE",
                "launch_date": datetime.date(1998, 11, 20),
                "objective": "Long-term microgravity and space environment research.",
                "spacecraft_id": db_spacecrafts["ISS"].id,
            },
            {
                "name": "New Horizons",
                "target_destination": "Pluto and Kuiper Belt",
                "status": "ACTIVE",
                "launch_date": datetime.date(2006, 1, 19),
                "objective": "Perform flyby study of Pluto and Kuiper belt objects.",
                "spacecraft_id": db_spacecrafts["New Horizons"].id,
            },
            {
                "name": "Rosetta",
                "target_destination": "Comet 67P",
                "status": "ARCHIVED",
                "launch_date": datetime.date(2004, 3, 2),
                "objective": "Detailed study of comet 67P/Churyumov-Gerasimenko.",
                "spacecraft_id": db_spacecrafts["Rosetta"].id,
            },
            {
                "name": "Tiangong",
                "target_destination": "Low Earth Orbit",
                "status": "ACTIVE",
                "launch_date": datetime.date(2021, 4, 29),
                "objective": "Chinese modular space station.",
                "spacecraft_id": db_spacecrafts["Tiangong"].id,
            },
        ]

        for m in missions_data:
            existing = (
                db.query(models.Mission)
                .filter(models.Mission.name == m["name"])
                .first()
            )
            if not existing:
                new_mission = models.Mission(**m)
                db.add(new_mission)
                db.commit()

                # Add sample crew if Apollo 11
                if m["name"] == "Apollo 11":
                    db.refresh(new_mission)
                    crew1 = models.Scientist(
                        name="Neil Armstrong",
                        role="Commander",
                        specialty="Piloting",
                        email="neil@nasa.gov",
                        bio="First man on the moon.",
                        mission_id=new_mission.id,
                    )
                    crew2 = models.Scientist(
                        name="Buzz Aldrin",
                        role="Lunar Module Pilot",
                        specialty="Engineering",
                        email="buzz@nasa.gov",
                        bio="Second man on the moon.",
                        mission_id=new_mission.id,
                    )
                    db.add_all([crew1, crew2])
                    db.commit()

        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
