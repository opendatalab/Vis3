from typing import Generator

from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from vis3.internal.config import settings

engine = None
database_url = settings.DATABASE_URL


# connect_args is needed only for SQLite. It's not needed for other databases
engine = create_engine(
    database_url,
    connect_args={"check_same_thread": False},
    echo=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# create database tables
def init_tables() -> None:
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator:
    db = None
    try:
        db = SessionLocal()
        yield db
        db.commit()
    except Exception as e:
        logger.error(e)
        if db:
            db.rollback()

        raise e
    finally:
        if db:
            db.close()
