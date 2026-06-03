"""
Shared pytest fixtures — each test runs inside its own rolled-back transaction
so the test database is always clean, with no need to drop/recreate tables.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# ---------------------------------------------------------------------------
# Use a file-based SQLite DB so the session-scoped engine is created once and
# shared across the entire test run.  The file is removed when the session ends.
# ---------------------------------------------------------------------------
_TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_run.db")
TEST_DATABASE_URL = f"sqlite:///{_TEST_DB_PATH}"


@pytest.fixture(scope="session")
def test_engine():
    """Session-scoped engine — tables are created once per pytest run."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()
    if os.path.exists(_TEST_DB_PATH):
        os.remove(_TEST_DB_PATH)


@pytest.fixture()
def db_session(test_engine):
    """
    Function-scoped DB session.  Each test starts a savepoint and rolls back
    after the test, keeping other tests isolated without re-creating tables.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    """TestClient that injects the test DB session into all API endpoints."""
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
