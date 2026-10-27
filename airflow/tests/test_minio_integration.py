import os
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from include.minio_client import get_minio_config

def test_minio_config_defaults_and_keys():
    """Valida la configuración de conexión y nombres de bucket para MinIO S3."""
    cfg = get_minio_config()
    assert cfg["endpoint"] is not None
    assert cfg["bucket"] == "sismowatch-bronze"
    assert "access_key" in cfg
    assert "secret_key" in cfg
    assert cfg["secure"] is False
