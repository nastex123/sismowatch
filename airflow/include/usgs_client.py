import hashlib
import json
import logging
import requests
from airflow.exceptions import AirflowException
from include.db_helpers import get_connection

logger = logging.getLogger("airflow.task")

USGS_REALTIME_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
USGS_QUERY_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"

def compute_payload_hash(payload: dict) -> str:
    raw_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

def fetch_and_ingest_feed(source_url: str = USGS_REALTIME_URL) -> int:
    logger.info(f"Conectando a API USGS: {source_url}...")
    try:
        response = requests.get(source_url, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.Timeout as timeout_err:
        logger.error(f"Timeout al conectar con USGS ({source_url}): {timeout_err}")
        raise AirflowException(f"Timeout en USGS API: {timeout_err}") from timeout_err
    except requests.exceptions.RequestException as req_err:
        logger.error(f"Error de red al consultar USGS ({source_url}): {req_err}")
        raise AirflowException(f"Error de red en USGS API: {req_err}") from req_err
    except json.JSONDecodeError as json_err:
        logger.error(f"Respuesta inválida no JSON de USGS: {json_err}")
        raise AirflowException(f"JSON malformado de USGS: {json_err}") from json_err

    features = data.get("features", [])
    logger.info(f"Se recibieron {len(features)} eventos de USGS. Procediendo a inserción idempotente en Bronze...")

    if not features:
        return 0

    conn = get_connection(role="ingest")
    inserted_count = 0
    try:
        with conn.cursor() as cur:
            upsert_sql = """
                INSERT INTO bronze.raw_events (id, payload, payload_hash, ingestion_source, ingested_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    payload_hash = EXCLUDED.payload_hash,
                    ingested_at = CURRENT_TIMESTAMP
                WHERE bronze.raw_events.payload_hash <> EXCLUDED.payload_hash;
            """
            for feature in features:
                feature_id = feature.get("id")
                if not feature_id:
                    continue
                p_hash = compute_payload_hash(feature)
                cur.execute(upsert_sql, (feature_id, json.dumps(feature), p_hash, source_url))
                inserted_count += 1
            conn.commit()
    except Exception as db_err:
        conn.rollback()
        logger.error(f"Falla al insertar en bronze.raw_events: {db_err}", exc_info=True)
        raise AirflowException(f"Error en base de datos Bronze: {db_err}") from db_err
    finally:
        conn.close()

    logger.info(f"Ingesta en Bronze completada exitosamente. Total procesados/actualizados: {inserted_count}")
    return inserted_count

def fetch_historical_backfill(start_date: str, end_date: str, min_magnitude: float = 2.5) -> int:
    params = {
        "format": "geojson",
        "starttime": start_date,
        "endtime": end_date,
        "minmagnitude": min_magnitude
    }
    logger.info(f"Iniciando Backfill histórico USGS desde {start_date} hasta {end_date} (mag >= {min_magnitude})...")
    try:
        response = requests.get(USGS_QUERY_URL, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()
    except Exception as err:
        logger.error(f"Falla en consulta histórica USGS: {err}", exc_info=True)
        raise AirflowException(f"Fallo en backfill USGS: {err}") from err

    features = data.get("features", [])
    logger.info(f"Backfill: {len(features)} eventos históricos obtenidos.")
    if not features:
        return 0

    conn = get_connection(role="ingest")
    count = 0
    source_tag = f"backfill_{start_date}_{end_date}"
    try:
        with conn.cursor() as cur:
            upsert_sql = """
                INSERT INTO bronze.raw_events (id, payload, payload_hash, ingestion_source, ingested_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    payload_hash = EXCLUDED.payload_hash,
                    ingested_at = CURRENT_TIMESTAMP
                WHERE bronze.raw_events.payload_hash <> EXCLUDED.payload_hash;
            """
            for feature in features:
                feature_id = feature.get("id")
                if not feature_id:
                    continue
                p_hash = compute_payload_hash(feature)
                cur.execute(upsert_sql, (feature_id, json.dumps(feature), p_hash, source_tag))
                count += 1
            conn.commit()
    except Exception as db_err:
        conn.rollback()
        logger.error(f"Falla en carga histórica a Bronze: {db_err}", exc_info=True)
        raise AirflowException(f"Error en backfill Bronze: {db_err}") from db_err
    finally:
        conn.close()

    return count
