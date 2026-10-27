import io
import json
import logging
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger("airflow.task")

def get_minio_config():
    endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "sismowatch_minio_admin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "SismoMinioPass2026!")
    secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
    bucket = os.getenv("MINIO_BRONZE_BUCKET", "sismowatch-bronze")
    return {
        "endpoint": endpoint,
        "access_key": access_key,
        "secret_key": secret_key,
        "secure": secure,
        "bucket": bucket
    }

def get_minio_client():
    from minio import Minio
    cfg = get_minio_config()
    return Minio(
        cfg["endpoint"],
        access_key=cfg["access_key"],
        secret_key=cfg["secret_key"],
        secure=cfg["secure"]
    )

def ensure_bronze_bucket() -> str:
    try:
        from minio import Minio
        cfg = get_minio_config()
        client = get_minio_client()
        bucket = cfg["bucket"]
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f"Bucket MinIO creado exitosamente: {bucket}")
        return bucket
    except Exception as err:
        logger.warning(f"No se pudo verificar bucket en MinIO (puede estar offline en tests): {err}")
        return os.getenv("MINIO_BRONZE_BUCKET", "sismowatch-bronze")

def upload_raw_to_minio(data: dict, object_key: str) -> Optional[str]:
    try:
        client = get_minio_client()
        bucket = ensure_bronze_bucket()
        raw_bytes = json.dumps(data, sort_keys=True).encode("utf-8")
        data_stream = io.BytesIO(raw_bytes)
        
        client.put_object(
            bucket_name=bucket,
            object_name=object_key,
            data=data_stream,
            length=len(raw_bytes),
            content_type="application/json"
        )
        logger.info(f"Payload crudo subido a MinIO S3: s3://{bucket}/{object_key}")
        return f"s3://{bucket}/{object_key}"
    except Exception as err:
        logger.warning(f"Error subiendo a MinIO: {err}")
        return None

def list_raw_minio_objects(prefix: str = "") -> List[str]:
    try:
        client = get_minio_client()
        bucket = ensure_bronze_bucket()
        objects = client.list_objects(bucket, prefix=prefix, recursive=True)
        return [obj.object_name for obj in objects]
    except Exception as err:
        logger.warning(f"Error listando objetos en MinIO: {err}")
        return []

def read_raw_from_minio(object_key: str) -> Optional[dict]:
    try:
        client = get_minio_client()
        cfg = get_minio_config()
        response = client.get_object(cfg["bucket"], object_key)
        content = response.read()
        response.close()
        response.release_conn()
        return json.loads(content.decode("utf-8"))
    except Exception as err:
        logger.warning(f"Error leyendo objeto {object_key} de MinIO: {err}")
        return None
