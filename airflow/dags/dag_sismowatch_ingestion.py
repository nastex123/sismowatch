"""
# DAG: sismowatch_ingestion
Consulta periódica (cada 30 segundos) al feed público de USGS (`all_hour.geojson`)
e inserción idempotente en la capa Bronze (`bronze.raw_events`).
Al completar satisfactoriamente, dispara el pipeline analítico de transformación.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from include.callbacks import task_failure_alert
from include.usgs_client import fetch_and_ingest_feed

DOC_MD = """
# SismoWatch - Ingesta Continua (Bronze)
- **Frecuencia**: Cada 30 segundos (`timedelta(seconds=30)`).
- **Origen**: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson`
- **Destino**: `bronze.raw_events` en PostgreSQL y MinIO S3 (`sismowatch-bronze`).
- **Idempotencia**: UPSERT garantizado mediante SHA-256 e ID del evento.
"""

default_args = {
    "owner": "sismowatch_data_team",
    "depends_on_past": False,
    "retries": 3,
    "retry_delay": timedelta(seconds=15),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=1),
    "execution_timeout": timedelta(minutes=2),
    "on_failure_callback": task_failure_alert,
}

with DAG(
    dag_id="sismowatch_ingestion",
    default_args=default_args,
    description="Sondeo periódico e ingesta en Bronze de sismos mundiales USGS cada 30 segundos",
    doc_md=DOC_MD,
    schedule=timedelta(seconds=30),
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "ingestion", "bronze", "usgs"],
) as dag:

    def ingest_task_wrapper(**context):
        inserted = fetch_and_ingest_feed()
        return f"Eventos procesados en Bronze: {inserted}"

    task_ingest_bronze = PythonOperator(
        task_id="ingest_usgs_feed_to_bronze",
        python_callable=ingest_task_wrapper,
    )

    task_trigger_transform = TriggerDagRunOperator(
        task_id="trigger_transformation_quality_dag",
        trigger_dag_id="sismowatch_transformation_quality",
        wait_for_completion=False,
        reset_dag_run=True,
    )

    task_ingest_bronze >> task_trigger_transform
