"""
# DAG: sismowatch_historical_backfill
Carga parametrizada de datos históricos de los últimos 30 días desde el endpoint FDSNWS de USGS.
Inserta en Bronze de forma idempotente y ejecuta el pipeline de PySpark hacia Silver y Gold.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.models.param import Param
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from include.callbacks import task_failure_alert
from include.usgs_client import fetch_historical_backfill

DOC_MD = """
# SismoWatch - Backfill Histórico Parametrizado (30 Días)
- **Activación**: Manual / Parametrizada desde la UI de Airflow o endpoint `POST /api/admin/backfill`.
- **Parámetros**:
  - `start_date`: Fecha de inicio (YYYY-MM-DD).
  - `end_date`: Fecha de fin (YYYY-MM-DD).
  - `min_magnitude`: Magnitud mínima (float, defecto 2.5).
"""

default_args = {
    "owner": "sismowatch_data_team",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(seconds=30),
    "execution_timeout": timedelta(minutes=15),
    "on_failure_callback": task_failure_alert,
}

with DAG(
    dag_id="sismowatch_historical_backfill",
    default_args=default_args,
    description="Backfill histórico parametrizado desde USGS hacia Medallón",
    doc_md=DOC_MD,
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "backfill", "historical", "usgs"],
    params={
        "start_date": Param((datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"), type="string", description="Fecha inicio YYYY-MM-DD"),
        "end_date": Param(datetime.now().strftime("%Y-%m-%d"), type="string", description="Fecha fin YYYY-MM-DD"),
        "min_magnitude": Param(2.5, type="number", description="Magnitud mínima"),
    },
) as dag:

    def run_backfill_task(**context):
        params = context.get("params", {})
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        min_mag = float(params.get("min_magnitude", 2.5))

        count = fetch_historical_backfill(start_date=start_date, end_date=end_date, min_magnitude=min_mag)
        return f"Backfill completado: {count} eventos históricos cargados en Bronze."

    task_backfill_bronze = PythonOperator(
        task_id="fetch_historical_usgs_to_bronze",
        python_callable=run_backfill_task,
    )

    task_trigger_transform = TriggerDagRunOperator(
        task_id="trigger_transformation_after_backfill",
        trigger_dag_id="sismowatch_transformation_quality",
        wait_for_completion=True,
        reset_dag_run=True,
    )

    task_backfill_bronze >> task_trigger_transform
