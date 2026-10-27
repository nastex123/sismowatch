"""
# DAG: sismowatch_ai_report
Generación programada y bajo demanda de reportes ejecutivos diarios mediante IA.
Sintetiza la actividad sísmica de las últimas 24 horas y valida que las cifras no alucinen.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from include.callbacks import task_failure_alert
from include.ai_service import generate_and_save_ai_report

DOC_MD = """
# SismoWatch - Reporte Ejecutivo Diario con IA
- **Frecuencia**: Diario (`@daily`) o invocado bajo demanda vía API REST.
- **Entrada**: Cifras consolidadas de la capa `gold`.
- **Salida**: `gold.ai_reports` (JSON estructurado con métricas, texto y auditoría de tokens/costo).
- **Control Antialucinación**: Validación determinista estricta en código Python.
"""

default_args = {
    "owner": "sismowatch_ai_team",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=30),
    "execution_timeout": timedelta(minutes=4),
    "on_failure_callback": task_failure_alert,
}

with DAG(
    dag_id="sismowatch_ai_report",
    default_args=default_args,
    description="Síntesis diaria ejecutiva con IA generativa y control antialucinación",
    doc_md=DOC_MD,
    schedule_interval="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "ai", "reporting", "gold"],
) as dag:

    def generate_report_task(**context):
        exec_date = context.get("execution_date") or context.get("data_interval_end")
        target_date = exec_date.date() if exec_date else None
        report = generate_and_save_ai_report(target_date)
        return f"Reporte IA generado exitosamente para fecha: {report.get('report_date')}"

    task_generate_ai_report = PythonOperator(
        task_id="generate_executive_ai_report",
        python_callable=generate_report_task,
    )
