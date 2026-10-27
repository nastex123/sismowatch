import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine

def get_db_config(role: str = "ingest") -> dict:
    host = os.getenv("SISMO_POSTGRES_HOST", "postgres")
    port = int(os.getenv("SISMO_POSTGRES_PORT", "5432"))
    db = os.getenv("SISMO_POSTGRES_DB", "sismowatch")

    if role == "ingest":
        user = os.getenv("SISMO_INGEST_USER", "sismo_ingest")
        password = os.getenv("SISMO_INGEST_PASSWORD", "IngestSecurePass2026!")
    elif role == "transform":
        user = os.getenv("SISMO_TRANSFORM_USER", "sismo_transform")
        password = os.getenv("SISMO_TRANSFORM_PASSWORD", "TransformSecurePass2026!")
    elif role == "api":
        user = os.getenv("SISMO_API_USER", "sismo_api")
        password = os.getenv("SISMO_API_PASSWORD", "ApiSecurePass2026!")
    else:
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "postgres_master_pass_2026")

    return {
        "host": host,
        "port": port,
        "database": db,
        "user": user,
        "password": password
    }

def get_connection(role: str = "ingest"):
    cfg = get_db_config(role)
    return psycopg2.connect(
        host=cfg["host"],
        port=cfg["port"],
        dbname=cfg["database"],
        user=cfg["user"],
        password=cfg["password"]
    )

def get_engine(role: str = "transform"):
    cfg = get_db_config(role)
    uri = f"postgresql+psycopg2://{cfg['user']}:{cfg['password']}@{cfg['host']}:{cfg['port']}/{cfg['database']}"
    return create_engine(uri, pool_pre_ping=True)
