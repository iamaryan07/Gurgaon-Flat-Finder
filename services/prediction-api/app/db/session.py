from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def engine():
    if not settings.database_url:
        return None
    return create_engine(settings.database_url, pool_pre_ping=True)


@lru_cache
def session_factory():
    return sessionmaker(bind=engine(), autoflush=False, expire_on_commit=False)


def get_db_session() -> Session | None:
    """Return a SQLAlchemy session when a database is configured, else None."""
    if not settings.database_url:
        return None
    return session_factory()()
