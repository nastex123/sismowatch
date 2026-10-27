import logging

logger = logging.getLogger("airflow.task")

def task_failure_alert(context):
    dag_id = context.get("task_instance").dag_id
    task_id = context.get("task_instance").task_id
    execution_date = context.get("execution_date")
    exception = context.get("exception")

    alert_message = (
        f"[ALERTA DE FALLO AIRFLOW] DAG: {dag_id} | Tarea: {task_id} | "
        f"Fecha: {execution_date} | Causa: {exception}"
    )
    logger.error(alert_message)
