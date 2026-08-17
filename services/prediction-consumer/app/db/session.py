from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.connection import connection_url


@lru_cache
def engine():
    return create_engine(connection_url(settings.database_url), pool_pre_ping=True)


@lru_cache
def session_factory():
    return sessionmaker(bind=engine(), autoflush=False, expire_on_commit=False)


def get_db_session() -> Session:
    return session_factory()()
