import sys
import requests
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Mission, Agency, Spacecraft
import datetime

TARGET_LIMIT = 150
LL_API_URL = "https://ll.thespacedevs.com/2.2.0/launch/?limit=30&ordering=-net"

def sync_missions():
    db: Session = SessionLocal()
    count = 0
    fetched_count = 0
    next_url = LL_API_URL

    print(f"Fetching up to {TARGET_LIMIT} missions from Launch Library API...")
    
    while next_url and fetched_count < TARGET_LIMIT:
        print(f"Fetching from {next_url} ...")
        try:
            response = requests.get(next_url, timeout=10)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Failed to fetch data: {e}")
            sys.exit(1)

        next_url = data.get("next")
        
        for launch in data.get("results", []):
            if fetched_count >= TARGET_LIMIT:
                break
            
            fetched_count += 1
            
            # 1. Agency
            provider = launch.get("launch_service_provider")
            agency_name = provider.get("name") if provider else "Unknown Agency"
            
            agency = db.query(Agency).filter(Agency.name == agency_name).first()
            if not agency:
                agency = Agency(name=agency_name, country="Unknown")
                db.add(agency)
                db.commit()
                db.refresh(agency)

            # 2. Spacecraft (Rocket)
            rocket = launch.get("rocket", {}).get("configuration", {})
            rocket_name = rocket.get("name", "Unknown Rocket")
            
            spacecraft = db.query(Spacecraft).filter(Spacecraft.name == rocket_name).first()
            if not spacecraft:
                spacecraft = Spacecraft(
                    name=rocket_name, 
                    classification="Launch Vehicle", 
                    agency_id=agency.id
                )
                db.add(spacecraft)
                db.commit()
                db.refresh(spacecraft)

            # 3. Mission
            ext_id = launch.get("id")
            existing_mission = db.query(Mission).filter(Mission.external_id == ext_id).first()
            if existing_mission:
                continue

            mission_data = launch.get("mission")
            objective = mission_data.get("description") if mission_data else "No description available."
            orbit = mission_data.get("orbit", {}).get("name") if mission_data else "LEO"
            if not orbit:
                orbit = "Unknown Orbit"

            # Parse date
            net_date_str = launch.get("net")
            launch_date = None
            if net_date_str:
                try:
                    launch_date = datetime.datetime.strptime(net_date_str[:10], "%Y-%m-%d").date()
                except ValueError:
                    pass
                    
            status_name = launch.get("status", {}).get("name", "Unknown")

            new_mission = Mission(
                external_id=ext_id,
                name=launch.get("name", "Unknown Mission"),
                target_destination=orbit,
                status=status_name,
                launch_date=launch_date,
                objective=objective,
                image_url=launch.get("image"),
                source_url=launch.get("url"),
                spacecraft_id=spacecraft.id
            )
            db.add(new_mission)
            count += 1
            
            # Commit periodically
            if count % 30 == 0:
                db.commit()

    try:
        db.commit()
        print(f"Successfully imported {count} new missions!")
    except Exception as e:
        db.rollback()
        print(f"Database error during commit: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    sync_missions()
