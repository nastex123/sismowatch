import os
import sys
import pytest
from fastapi.testclient import TestClient

# Asegurar path de importación
API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, API_DIR)

from main import app, create_jwt_token

client = TestClient(app)

def test_health_endpoint():
    """Valida que el endpoint de salud responda 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_unauthenticated_request_rejected():
    """Valida que peticiones sin token a endpoints protegidos retornen 401 Unauthorized."""
    response = client.get("/api/kpis")
    assert response.status_code == 401
    assert "no proporcionadas" in response.json()["detail"]

def test_invalid_token_rejected():
    """Valida que un token corrupto o mal firmado sea rechazado con 401."""
    headers = {"Authorization": "Bearer invalid_malformed_token_123"}
    response = client.get("/api/kpis", headers=headers)
    assert response.status_code == 401

def test_viewer_role_access_and_restrictions():
    """Valida que un token con rol 'viewer' pueda ver KPIs pero sea rechazado con 403 en endpoints de admin."""
    viewer_token = create_jwt_token({"sub": "viewer@sismowatch.internal", "role": "viewer", "full_name": "Test Viewer"})
    headers = {"Authorization": f"Bearer {viewer_token}"}

    # 1. Acceso a endpoints de administración debe retornar 403 Forbidden
    response_quarantine = client.get("/api/quality/quarantine", headers=headers)
    assert response_quarantine.status_code == 403
    assert "requiere rol de Administrador" in response_quarantine.json()["detail"]

    response_backfill = client.post("/api/admin/backfill", headers=headers, json={"start_date": "2026-09-01", "end_date": "2026-09-10", "min_magnitude": 3.0})
    assert response_backfill.status_code == 403
    assert "requiere rol de Administrador" in response_backfill.json()["detail"]

def test_admin_role_can_access_admin_endpoints(monkeypatch):
    """Valida que un token con rol 'admin' sea admitido en endpoints administrativos."""
    admin_token = create_jwt_token({"sub": "admin@sismowatch.internal", "role": "admin", "full_name": "Test Admin"})
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Mockear llamada a BD para cuarentena
    class MockCursor:
        def __enter__(self): return self
        def __exit__(self, exc_type, exc_val, exc_tb): pass
        def execute(self, query, params=None): pass
        def fetchall(self): return [{"id": 1, "raw_id": "us001", "rejection_reason": "Latitud fuera de rango", "failed_at": "2026-10-27T00:00:00Z", "raw_payload": {}}]

    class MockConn:
        def cursor(self): return MockCursor()
        def close(self): pass

    import main
    monkeypatch.setattr(main, "get_db_connection", lambda: MockConn())

    response = client.get("/api/quality/quarantine", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["raw_id"] == "us001"
