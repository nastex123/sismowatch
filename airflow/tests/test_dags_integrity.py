import os
import sys
import pytest

# Asegurar que include y dags estén en el path de Python
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "dags"))

def test_airflow_dags_integrity():
    """Valida que todos los DAGs se importen sin errores de sintaxis ni ciclos."""
    try:
        from airflow.models import DagBag
    except ImportError:
        pytest.skip("Apache Airflow no instalado en el host local; esta prueba se ejecuta en el contenedor de Airflow.")

    dagbag = DagBag(dag_folder=os.path.join(BASE_DIR, "dags"), include_examples=False)

    # Verificar que no hayan excepciones de importación
    assert len(dagbag.import_errors) == 0, f"Errores al importar DAGs: {dagbag.import_errors}"

    # Verificar presencia de los 4 DAGs clave
    expected_dags = [
        "sismowatch_ingestion",
        "sismowatch_transformation_quality",
        "sismowatch_ai_report",
        "sismowatch_historical_backfill"
    ]
    for dag_id in expected_dags:
        assert dag_id in dagbag.dags, f"DAG faltante en el catálogo de Airflow: {dag_id}"
        dag = dagbag.dags[dag_id]
        assert len(dag.tasks) > 0, f"El DAG {dag_id} no contiene tareas registradas"
