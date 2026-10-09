from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./minutely.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


# SQLite ignores foreign keys by default. Without this, ON DELETE CASCADE does nothing.
@event.listens_for(engine, "connect")
def enable_sqlite_fk(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()