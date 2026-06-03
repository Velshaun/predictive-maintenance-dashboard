from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

# Allow local development without Docker/Postgres by falling back to SQLite
if not DATABASE_URL:
    _db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'maintenance.db')
    DATABASE_URL = f'sqlite:///{_db_path}'
    print(f'[db] DATABASE_URL not set — using SQLite fallback: {DATABASE_URL}')

_is_sqlite = DATABASE_URL.startswith('sqlite')

_engine_kwargs = {'pool_pre_ping': True}
if _is_sqlite:
    # SQLite requires check_same_thread=False when used with FastAPI
    _engine_kwargs['connect_args'] = {'check_same_thread': False}

engine = create_engine(DATABASE_URL, **_engine_kwargs)

# Enable WAL mode for SQLite so concurrent reads don't block writes
if _is_sqlite:
    @event.listens_for(engine, 'connect')
    def _set_sqlite_pragma(dbapi_conn, _rec):
        dbapi_conn.execute('PRAGMA journal_mode=WAL')
        dbapi_conn.execute('PRAGMA foreign_keys=ON')

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
