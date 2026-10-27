"""
# DAG: sismowatch_transformation_quality
Ejecución del motor PySpark en memoria para transformar registros de Bronze a Silver y Gold.
Aplica compuertas de calidad bloqueantes, Z-Score de magnitud y detección de enjambres.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from include.callbacks import task_failure_alert
from include.spark_transformations import run_pyspark_pipeline

DOC_MD = """
# SismoWatch - Transformación y Calidad (PySpark Medallón)
- **Activación**: Disparado automáticamente por `sismowatch_ingestion` o por backfill.
- **Entrada**: `bronze.raw_events`.
- **Salida Silver**: `silver.events` (aprobados), `silver.rejected_events` (rechazados con motivo), `silver.quality_metrics`.
- **Salida Gold**: `gold.kpis_24h`, `gold.hourly_timeseries`, `gold.active_regions`, `gold.detected_anomalies`.
"""

default_args = {
    "owner": "sismowatch_data_team",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=20),
    "execution_timeout": timedelta(minutes=5),
    "on_failure_callback": task_failure_alert,
}

with DAG(
    dag_id="sismowatch_transformation_quality",
    default_args=default_args,
    description="Transformación Medallón y control de calidad con PySpark",
    doc_md=DOC_MD,
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "transformation", "pyspark", "silver", "gold"],
) as dag:

    def run_spark_task(**context):
        dag_run = context.get("dag_run")
        batch_id = dag_run.run_id if dag_run else None
        res = run_pyspark_pipeline(batch_id=batch_id)
        return res

    task_spark_transform = PythonOperator(
        task_id="pyspark_medallion_processing",
        python_callable=run_spark_task,
    )
