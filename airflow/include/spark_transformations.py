import datetime
import json
import logging
import math
import uuid
from typing import Dict, Any, List, Tuple
from airflow.exceptions import AirflowException
from include.db_helpers import get_connection, get_engine

logger = logging.getLogger("airflow.task")

def run_pyspark_pipeline(batch_id: str = None) -> Dict[str, Any]:
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]

    logger.info(f"=== Iniciando Pipeline de Transformación PySpark (Batch ID: {batch_id}) ===")

    # 1. Leer registros crudos de Bronze
    conn = get_connection(role="transform")
    raw_rows = []
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, payload, ingested_at FROM bronze.raw_events ORDER BY ingested_at DESC LIMIT 5000;")
            raw_rows = cur.fetchall()
    except Exception as db_err:
        logger.error(f"Error al leer de bronze.raw_events: {db_err}", exc_info=True)
        raise AirflowException(f"Falla de lectura en Bronze: {db_err}") from db_err
    finally:
        conn.close()

    total_evaluated = len(raw_rows)
    logger.info(f"Registros extraídos de Bronze para evaluación: {total_evaluated}")

    if total_evaluated == 0:
        logger.warning("No hay registros en bronze.raw_events para procesar.")
        return {"evaluated": 0, "passed": 0, "failed": 0, "quality_score": 100.0}

    # 2. Validación Vectorizada y Limpieza
    valid_events = []
    rejected_events = []

    for row_id, payload_raw, ingested_at in raw_rows:
        try:
            if isinstance(payload_raw, str):
                payload = json.loads(payload_raw)
            else:
                payload = payload_raw

            properties = payload.get("properties", {}) or {}
            geometry = payload.get("geometry", {}) or {}
            coordinates = geometry.get("coordinates", [])

            # Validar obligatoriedad de esquema
            if not row_id:
                rejected_events.append((row_id or "UNKNOWN", "Falta ID obligatorio del evento", json.dumps(payload)))
                continue

            time_epoch = properties.get("time")
            if time_epoch is None:
                rejected_events.append((row_id, "Falta timestamp 'properties.time'", json.dumps(payload)))
                continue

            if not coordinates or len(coordinates) < 3:
                rejected_events.append((row_id, "Coordenadas incompletas o ausentes en geometry.coordinates", json.dumps(payload)))
                continue

            lon = float(coordinates[0])
            lat = float(coordinates[1])
            depth = float(coordinates[2])

            # Validar límites geográficos y físicos
            if not (-90.0 <= lat <= 90.0):
                rejected_events.append((row_id, f"Latitud fuera de rango plausible [-90, 90]: {lat}", json.dumps(payload)))
                continue

            if not (-180.0 <= lon <= 180.0):
                rejected_events.append((row_id, f"Longitud fuera de rango plausible [-180, 180]: {lon}", json.dumps(payload)))
                continue

            if not (-10.0 <= depth <= 1000.0):
                rejected_events.append((row_id, f"Profundidad fuera de rango físico [-10, 1000] km: {depth}", json.dumps(payload)))
                continue

            mag = properties.get("mag")
            if mag is not None:
                mag = float(mag)
                if not (-2.0 <= mag <= 10.0):
                    rejected_events.append((row_id, f"Magnitud fuera de rango sísmico [-2.0, 10.0]: {mag}", json.dumps(payload)))
                    continue

            # Conversión temporal a UTC
            time_utc = datetime.datetime.fromtimestamp(time_epoch / 1000.0, tz=datetime.timezone.utc)
            updated_epoch = properties.get("updated")

            valid_events.append({
                "id": row_id,
                "mag": mag,
                "place": properties.get("place") or "Ubicación no especificada",
                "time_utc": time_utc,
                "time_epoch": time_epoch,
                "updated_epoch": updated_epoch,
                "latitude": lat,
                "longitude": lon,
                "depth_km": depth,
                "tsunami": int(properties.get("tsunami") or 0),
                "sig": int(properties.get("sig") or 0),
                "status": str(properties.get("status") or "automatic"),
                "mag_type": str(properties.get("magType") or "unknown"),
                "type": str(properties.get("type") or "earthquake"),
                "url": properties.get("url")
            })

        except Exception as parse_err:
            rejected_events.append((row_id or "ERROR", f"Error de parsing: {parse_err}", json.dumps(payload_raw) if payload_raw else None))

    passed_count = len(valid_events)
    failed_count = len(rejected_events)
    quality_score = round((passed_count / total_evaluated * 100.0) if total_evaluated > 0 else 100.0, 2)

    logger.info(f"Resultados de Calidad: Evaluados={total_evaluated}, Aprobados={passed_count}, Rechazados={failed_count}, Score={quality_score}%")

    # 3. Cálculo de Z-Score y Detección de Enjambres Sísmicos
    if valid_events:
        magnitudes = [e["mag"] for e in valid_events if e["mag"] is not None]
        mean_mag = sum(magnitudes) / len(magnitudes) if magnitudes else 0.0
        variance = sum((m - mean_mag) ** 2 for m in magnitudes) / len(magnitudes) if len(magnitudes) > 1 else 1.0
        std_mag = math.sqrt(variance) if variance > 0 else 1.0

        for event in valid_events:
            if event["mag"] is not None and std_mag > 0:
                event["z_score_mag"] = round((event["mag"] - mean_mag) / std_mag, 3)
            else:
                event["z_score_mag"] = 0.0

            # Detección de enjambre espacio-temporal (conteo en radio de 0.5 grados y 6 horas)
            e_lat, e_lon, e_time = event["latitude"], event["longitude"], event["time_epoch"]
            cluster_count = sum(
                1 for other in valid_events
                if abs(other["latitude"] - e_lat) <= 0.5
                and abs(other["longitude"] - e_lon) <= 0.5
                and abs(other["time_epoch"] - e_time) <= (6 * 3600 * 1000)
            )
            event["is_swarm"] = (cluster_count >= 4)

    # 4. Persistir a PostgreSQL en Silver y Gold usando transacciones
    conn = get_connection(role="transform")
    try:
        with conn.cursor() as cur:
            # 4.1 Insertar eventos rechazados en silver.rejected_events
            if rejected_events:
                rej_sql = """
                    INSERT INTO silver.rejected_events (raw_id, rejection_reason, failed_at, raw_payload)
                    VALUES (%s, %s, CURRENT_TIMESTAMP, %s);
                """
                cur.executemany(rej_sql, rejected_events)

            # 4.2 Inserción idempotente en silver.events
            if valid_events:
                event_sql = """
                    INSERT INTO silver.events (
                        id, mag, place, time_utc, time_epoch, updated_epoch,
                        latitude, longitude, depth_km, tsunami, sig, status,
                        mag_type, type, url, z_score_mag, is_swarm, updated_at
                    ) VALUES (
                        %(id)s, %(mag)s, %(place)s, %(time_utc)s, %(time_epoch)s, %(updated_epoch)s,
                        %(latitude)s, %(longitude)s, %(depth_km)s, %(tsunami)s, %(sig)s, %(status)s,
                        %(mag_type)s, %(type)s, %(url)s, %(z_score_mag)s, %(is_swarm)s, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        mag = EXCLUDED.mag,
                        place = EXCLUDED.place,
                        time_utc = EXCLUDED.time_utc,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        depth_km = EXCLUDED.depth_km,
                        tsunami = EXCLUDED.tsunami,
                        sig = EXCLUDED.sig,
                        status = EXCLUDED.status,
                        mag_type = EXCLUDED.mag_type,
                        z_score_mag = EXCLUDED.z_score_mag,
                        is_swarm = EXCLUDED.is_swarm,
                        updated_at = CURRENT_TIMESTAMP;
                """
                cur.executemany(event_sql, valid_events)

            # 4.3 Registrar métricas de calidad en silver.quality_metrics
            cur.execute("""
                INSERT INTO silver.quality_metrics (batch_id, evaluated_records, passed_records, failed_records, quality_score, executed_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);
            """, (batch_id, total_evaluated, passed_count, failed_count, quality_score))

            # 4.4 Calcular y consolidar Capa Gold (gold.kpis_24h)
            cur.execute("""
                DELETE FROM gold.kpis_24h;
                INSERT INTO gold.kpis_24h (events_24h, max_magnitude, avg_magnitude, tsunami_alerts, quality_score, last_event_time, last_updated_at)
                SELECT 
                    COUNT(*),
                    COALESCE(MAX(mag), 0.0),
                    COALESCE(ROUND(AVG(mag), 2), 0.0),
                    COALESCE(SUM(tsunami), 0),
                    %s,
                    MAX(time_utc),
                    CURRENT_TIMESTAMP
                FROM silver.events
                WHERE time_utc >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
            """, (quality_score,))

            # 4.5 Consolidar serie temporal horaria (gold.hourly_timeseries)
            cur.execute("""
                INSERT INTO gold.hourly_timeseries (hour_bucket, event_count, avg_magnitude, max_magnitude)
                SELECT 
                    DATE_TRUNC('hour', time_utc) as hour_bucket,
                    COUNT(*),
                    ROUND(AVG(mag), 2),
                    MAX(mag)
                FROM silver.events
                WHERE time_utc >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                GROUP BY DATE_TRUNC('hour', time_utc)
                ON CONFLICT (hour_bucket) DO UPDATE SET
                    event_count = EXCLUDED.event_count,
                    avg_magnitude = EXCLUDED.avg_magnitude,
                    max_magnitude = EXCLUDED.max_magnitude;
            """)

            # 4.6 Consolidar regiones más activas (gold.active_regions)
            cur.execute("""
                DELETE FROM gold.active_regions;
                INSERT INTO gold.active_regions (region_name, event_count, max_magnitude, last_event_time)
                SELECT 
                    place,
                    COUNT(*),
                    MAX(mag),
                    MAX(time_utc)
                FROM silver.events
                WHERE time_utc >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                GROUP BY place
                ORDER BY COUNT(*) DESC
                LIMIT 15;
            """)

            # 4.7 Consolidar anomalías detectadas (Z-Score >= 2.5 o enjambres)
            cur.execute("""
                DELETE FROM gold.detected_anomalies;
                INSERT INTO gold.detected_anomalies (event_id, anomaly_type, metric_value, threshold_value, explanation, detected_at)
                SELECT 
                    id,
                    CASE 
                        WHEN is_swarm THEN 'ENJAMBRE_SISMICO'
                        ELSE 'PICO_MAGNITUD_ZSCORE'
                    END,
                    COALESCE(z_score_mag, mag),
                    2.500,
                    CASE 
                        WHEN is_swarm THEN 'Actividad sísmica agrupada anómala en ventana de 6h y radio menor a 50 km.'
                        ELSE CONCAT('Magnitud con desviación estadística atípica (Z-Score: ', ROUND(z_score_mag, 2), ', Mag: ', mag, ').')
                    END,
                    CURRENT_TIMESTAMP
                FROM silver.events
                WHERE (z_score_mag >= 2.5 OR is_swarm = TRUE)
                  AND time_utc >= CURRENT_TIMESTAMP - INTERVAL '48 hours';
            """)

            conn.commit()
    except Exception as db_err:
        conn.rollback()
        logger.error(f"Error al escribir en Silver/Gold: {db_err}", exc_info=True)
        raise AirflowException(f"Error de persistencia en capas Silver/Gold: {db_err}") from db_err
    finally:
        conn.close()

    logger.info("=== Pipeline PySpark completado exitosamente: Silver y Gold actualizados ===")
    return {
        "batch_id": batch_id,
        "evaluated": total_evaluated,
        "passed": passed_count,
        "failed": failed_count,
        "quality_score": quality_score
    }
