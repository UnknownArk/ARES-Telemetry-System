import os
from dotenv import load_dotenv 
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()
db_password= os.getenv("DB_PASSWORD")
SQLALCHEMY_DATABASE_URL=f"mysql+mysqlconnector://root:{db_password}@127.0.0.1/space_exploration"

engine=create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal=sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base=declarative_base()

def get_db():
    db= SessionLocal()
    try:
        yield db
    finally:
        db.close()
