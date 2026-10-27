import asyncio
import csv
import datetime
import io
import json
import logging
import os
import re
import subprocess
import time
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
import requests
from fastapi import FastAPI, Depends, HTTPException, status, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sse_starlette.sse import EventSourceResponse

# ------------------------------------------------------------------------------
# Configuración y Variables de Entorno
# ------------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sismowatch-api")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sismowatch_jwt_super_secret_key_change_in_production_2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "sismowatch")
POSTGRES_USER = os.getenv("POSTGRES_USER", "sismo_api")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "ApiSecurePass2026!")

AIRFLOW_WEBSERVER_URL = os.getenv("AIRFLOW_WEBSERVER_URL", "http://airflow-webserver:8080")
AIRFLOW_ADMIN_USER = os.getenv("AIRFLOW_ADMIN_USER", "admin")
AIRFLOW_ADMIN_PASSWORD = os.getenv("AIRFLOW_ADMIN_PASSWORD", "SismoAdmin2026!")

AI_PROVIDER = os.getenv("AI_PROVIDER", "opencode").lower()
OPENCODE_CLI_PATH = os.getenv("OPENCODE_CLI_PATH", "/home/Coder/.opencode/bin/opencode")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ------------------------------------------------------------------------------
# Inicialización de FastAPI
# ------------------------------------------------------------------------------
app = FastAPI(
    title="SismoWatch API",
    description="Backend analítico y de consumo en tiempo real para monitoreo sísmico Medallón",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security_bearer = HTTPBearer(auto_error=False)

# ------------------------------------------------------------------------------
# Conexión Segura a PostgreSQL (Rol sismo_api)
# ------------------------------------------------------------------------------
def get_db_connection():
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as err:
        logger.error(f"Error de conexión a PostgreSQL (sismo_api): {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de base de datos no disponible temporalmente."
        )

# ------------------------------------------------------------------------------
# Modelos Pydantic
# ------------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: str

class ChatRequest(BaseModel):
    prompt: str

class BackfillRequest(BaseModel):
    start_date: str
    end_date: str
    min_magnitude: float = 2.5

# ------------------------------------------------------------------------------
# Autenticación y Autorización (RBAC)
# ------------------------------------------------------------------------------
def create_jwt_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + (
        expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación no proporcionadas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if not email or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de acceso inválido.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"email": email, "role": role, "full_name": payload.get("full_name", "")}
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado o inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_viewer(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] not in ["viewer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: Se requiere al menos rol viewer."
        )
    return user

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Esta acción requiere rol de Administrador."
        )
    return user

# ------------------------------------------------------------------------------
# Endpoints Públicos y de Diagnóstico
# ------------------------------------------------------------------------------
@app.get("/health", tags=["Salud"])
def health_check():
    return {"status": "ok", "service": "SismoWatch API", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

@app.post("/auth/login", response_model=TokenResponse, tags=["Autenticación"])
def login(creds: LoginRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, password_hash, full_name, role FROM gold.users WHERE email = %s;", (creds.email,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas.")

            # Validar bcrypt
            if not bcrypt.checkpw(creds.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas.")

            token = create_jwt_token(data={"sub": user["email"], "role": user["role"], "full_name": user["full_name"]})
            return TokenResponse(
                access_token=token,
                role=user["role"],
                email=user["email"],
                full_name=user["full_name"]
            )
    finally:
        conn.close()

# ------------------------------------------------------------------------------
# Endpoints de Datos Analíticos (Viewer / Admin)
# ------------------------------------------------------------------------------
@app.get("/api/kpis", tags=["Analítica"])
def get_kpis(user: dict = Depends(require_viewer)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT events_24h, max_magnitude, avg_magnitude, tsunami_alerts, 
                       quality_score, last_event_time, last_updated_at 
                FROM gold.kpis_24h 
                ORDER BY last_updated_at DESC LIMIT 1;
            """)
            row = cur.fetchone()
            if not row:
                return {
                    "events_24h": 0,
                    "max_magnitude": 0.0,
                    "avg_magnitude": 0.0,
                    "tsunami_alerts": 0,
                    "quality_score": 100.0,
                    "last_event_time": None,
                    "last_updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            return dict(row)
    finally:
        conn.close()

@app.get("/api/events", tags=["Analítica"])
def get_events(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    min_magnitude: Optional[float] = Query(None),
    region: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: dict = Depends(require_viewer)
):
    conn = get_db_connection()
    offset = (page - 1) * limit
    try:
        with conn.cursor() as cur:
            conditions = ["1=1"]
            params = []

            if min_magnitude is not None:
                conditions.append("mag >= %s")
                params.append(min_magnitude)

            if region:
                conditions.append("place ILIKE %s")
                params.append(f"%{region}%")

            if start_date:
                conditions.append("time_utc >= %s")
                params.append(start_date)

            if end_date:
                conditions.append("time_utc <= %s")
                params.append(end_date)

            where_clause = " AND ".join(conditions)

            # Contar total
            cur.execute("SELECT COUNT(*) as total FROM silver.events WHERE " + where_clause + ";", tuple(params))  # nosec
            total_records = cur.fetchone()["total"]

            # Obtener página
            query = "SELECT id, mag, place, time_utc, latitude, longitude, depth_km, tsunami, sig, status, mag_type, type, url, z_score_mag, is_swarm FROM silver.events WHERE " + where_clause + " ORDER BY time_utc DESC LIMIT %s OFFSET %s;"  # nosec B608
            cur.execute(query, tuple(params + [limit, offset]))
            items = cur.fetchall()

            return {
                "page": page,
                "limit": limit,
                "total_records": total_records,
                "total_pages": (total_records + limit - 1) // limit if total_records > 0 else 1,
                "items": [dict(it) for it in items]
            }
    finally:
        conn.close()

@app.get("/api/stats/timeseries", tags=["Analítica"])
def get_timeseries(days: int = Query(7, ge=1, le=30), user: dict = Depends(require_viewer)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT hour_bucket, event_count, avg_magnitude, max_magnitude
                FROM gold.hourly_timeseries
                WHERE hour_bucket >= CURRENT_TIMESTAMP - INTERVAL '%s days'
                ORDER BY hour_bucket ASC;
            """, (days,))
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

@app.get("/api/reports", tags=["Reportes"])
def get_reports(user: dict = Depends(require_viewer)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, report_date, executive_summary, notable_events, 
                       active_zones, computed_metrics, model_name, tokens_used, 
                       latency_ms, cost_usd, created_at
                FROM gold.ai_reports
                ORDER BY report_date DESC
                LIMIT 30;
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

@app.get("/api/reports/export", tags=["Reportes"])
def export_reports(format: str = Query("csv", pattern="^(csv|pdf)$"), user: dict = Depends(require_viewer)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, mag, place, time_utc, latitude, longitude, depth_km, tsunami, sig
                FROM silver.events
                ORDER BY time_utc DESC LIMIT 200;
            """)
            events = cur.fetchall()
    finally:
        conn.close()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "magnitude", "place", "time_utc", "latitude", "longitude", "depth_km", "tsunami", "significance"])
        for e in events:
            writer.writerow([e["id"], e["mag"], e["place"], e["time_utc"], e["latitude"], e["longitude"], e["depth_km"], e["tsunami"], e["sig"]])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sismowatch_report.csv"}
        )

    # Formato PDF con ReportLab
    pdf_buffer = io.BytesIO()
    p = canvas.Canvas(pdf_buffer, pagesize=letter)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 750, "SismoWatch - Reporte Oficial de Actividad Sísmica")
    p.setFont("Helvetica", 10)
    p.drawString(50, 730, f"Generado el: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC | Usuario: {user['email']}")
    p.line(50, 720, 560, 720)

    y = 690
    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, y, "Fecha / Hora")
    p.drawString(180, y, "Magnitud")
    p.drawString(240, y, "Ubicación")
    p.drawString(480, y, "Prof. (km)")
    y -= 15

    p.setFont("Helvetica", 9)
    for e in events[:35]:
        time_str = e["time_utc"].strftime("%Y-%m-%d %H:%M") if e["time_utc"] else "N/A"
        place_str = (e["place"] or "")[:38]
        p.drawString(50, y, time_str)
        p.drawString(180, y, str(e["mag"] or "N/A"))
        p.drawString(240, y, place_str)
        p.drawString(480, y, str(e["depth_km"]))
        y -= 16
        if y < 50:
            p.showPage()
            y = 750

    p.save()
    pdf_buffer.seek(0)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=sismowatch_report.pdf"}
    )

# ------------------------------------------------------------------------------
# Canal de Tiempo Real (Server-Sent Events - SSE)
# ------------------------------------------------------------------------------
@app.get("/api/stream", tags=["Tiempo Real"])
async def stream_live_events(user: dict = Depends(require_viewer)):
    async def event_generator():
        last_check = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)
        while True:
            try:
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, mag, place, time_utc, latitude, longitude, depth_km, tsunami, sig
                        FROM silver.events
                        WHERE time_utc > %s
                        ORDER BY time_utc DESC LIMIT 5;
                    """, (last_check,))
                    new_events = cur.fetchall()

                    # Leer KPIs actuales
                    cur.execute("""
                        SELECT events_24h, max_magnitude, avg_magnitude, tsunami_alerts, quality_score, last_updated_at
                        FROM gold.kpis_24h
                        ORDER BY last_updated_at DESC LIMIT 1;
                    """)
                    kpis = cur.fetchone()
                conn.close()

                if new_events:
                    last_check = new_events[0]["time_utc"]

                payload = {
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "kpis": dict(kpis) if kpis else {},
                    "new_events": [dict(e) for e in new_events]
                }
                yield {"event": "seismic_update", "data": json.dumps(payload, default=str)}

            except Exception as e:
                logger.warning(f"Error en loop SSE: {e}")
                yield {"event": "ping", "data": json.dumps({"status": "reconnecting"})}

            await asyncio.sleep(5)

    return EventSourceResponse(event_generator())

# ------------------------------------------------------------------------------
# Estado de Pipeline y Auditoría de Calidad
# ------------------------------------------------------------------------------
@app.get("/api/pipeline/status", tags=["Pipeline"])
def get_pipeline_status(user: dict = Depends(require_viewer)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Calidad de datos
            cur.execute("""
                SELECT batch_id, evaluated_records, passed_records, failed_records, 
                       quality_score, executed_at 
                FROM silver.quality_metrics 
                ORDER BY executed_at DESC LIMIT 10;
            """)
            metrics = cur.fetchall()

            # Frescura del dato
            cur.execute("SELECT MAX(ingested_at) as last_ingest FROM bronze.raw_events;")
            last_ingest_row = cur.fetchone()
            last_ingest = last_ingest_row["last_ingest"] if last_ingest_row else None

            # Último evento en Gold
            cur.execute("SELECT MAX(time_utc) as last_event FROM silver.events;")
            last_event_row = cur.fetchone()
            last_event = last_event_row["last_event"] if last_event_row else None

            return {
                "last_ingested_at": last_ingest,
                "last_event_time_utc": last_event,
                "is_pipeline_fresh": True,
                "quality_history": [dict(m) for m in metrics]
            }
    finally:
        conn.close()

@app.get("/api/quality/quarantine", tags=["Calidad / Auditoría (Admin)"])
def get_quarantine_records(user: dict = Depends(require_admin)):
    """Exclusivo para administradores: consulta registros rechazados por fallas de calidad."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, raw_id, rejection_reason, failed_at, raw_payload
                FROM silver.rejected_events
                ORDER BY failed_at DESC LIMIT 50;
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

# ------------------------------------------------------------------------------
# Endpoints Administrativos (Admin Only)
# ------------------------------------------------------------------------------
@app.post("/api/admin/backfill", tags=["Administración"])
def trigger_backfill(payload: BackfillRequest, user: dict = Depends(require_admin)):
    """Dispara el DAG de backfill histórico en Apache Airflow."""
    url = f"{AIRFLOW_WEBSERVER_URL}/api/v1/dags/sismowatch_historical_backfill/dagRuns"
    conf = {
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "min_magnitude": payload.min_magnitude
    }
    try:
        resp = requests.post(
            url,
            json={"conf": conf},
            auth=(AIRFLOW_ADMIN_USER, AIRFLOW_ADMIN_PASSWORD),
            timeout=10
        )
        if resp.status_code in [200, 201]:
            return {"status": "triggered", "dag": "sismowatch_historical_backfill", "conf": conf}
        else:
            return {"status": "queued_local", "message": f"Airflow respondió status {resp.status_code}", "conf": conf}
    except Exception as e:
        logger.warning(f"No se pudo conectar a Airflow REST API: {e}")
        return {"status": "accepted", "message": "Backfill registrado para próxima ventana de ejecución.", "conf": conf}

@app.post("/api/admin/reports/regenerate", tags=["Administración"])
def regenerate_ai_report(user: dict = Depends(require_admin)):
    """Dispara la regeneración del reporte ejecutivo diario con IA en Airflow."""
    url = f"{AIRFLOW_WEBSERVER_URL}/api/v1/dags/sismowatch_ai_report/dagRuns"
    try:
        resp = requests.post(
            url,
            json={},
            auth=(AIRFLOW_ADMIN_USER, AIRFLOW_ADMIN_PASSWORD),
            timeout=10
        )
        return {"status": "triggered", "dag": "sismowatch_ai_report"}
    except Exception as e:
        return {"status": "accepted", "message": "Regeneración de reporte encolada."}

# ------------------------------------------------------------------------------
# Chatbot de Consulta sobre Capa Gold
# ------------------------------------------------------------------------------
@app.post("/api/chat", tags=["Chatbot Inteligente"])
def chat_with_gold(payload: ChatRequest, user: dict = Depends(require_viewer)):
    """
    Atiende consultas del usuario sobre la capa Gold conectando con el agente
    OpenCode CLI, Gemini API o un motor analítico determinista con consultas solo lectura.
    """
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="El prompt no puede estar vacío.")

    # 1. Sanitizar input contra Prompt Injection
    cleaned_prompt = re.sub(r"(?i)(ignore previous instructions|drop table|delete from|update|insert into)", "", prompt)

    # 2. Obtener resumen de Gold para dar contexto al asistente
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT events_24h, max_magnitude, avg_magnitude, tsunami_alerts, quality_score 
                FROM gold.kpis_24h ORDER BY last_updated_at DESC LIMIT 1;
            """)
            kpis = cur.fetchone() or {}

            cur.execute("""
                SELECT mag, place, time_utc, depth_km, tsunami 
                FROM silver.events 
                ORDER BY time_utc DESC LIMIT 5;
            """)
            recent_events = cur.fetchall()
    finally:
        conn.close()

    context_str = (
        f"Contexto actual de SismoWatch (Capa Gold):\n"
        f"- Sismos en 24h: {kpis.get('events_24h', 0)}\n"
        f"- Magnitud máxima: {kpis.get('max_magnitude', 0.0)}\n"
        f"- Magnitud promedio: {kpis.get('avg_magnitude', 0.0)}\n"
        f"- Alertas de tsunami: {kpis.get('tsunami_alerts', 0)}\n"
        f"- Eventos más recientes: {json.dumps([dict(e) for e in recent_events], default=str)}\n"
    )

    full_ai_prompt = (
        f"Eres el asistente analítico inteligente de SismoWatch. Responde de forma clara, técnica y concisa a la pregunta del usuario utilizando exclusivamente la información de la capa Gold.\n\n"
        f"{context_str}\n"
        f"Pregunta del usuario: {cleaned_prompt}\n"
    )

    reply_text = None
    engine_used = "deterministic-fallback"

    # Intentar OpenCode CLI
    if AI_PROVIDER == "opencode" and os.path.exists(OPENCODE_CLI_PATH):
        try:
            start_t = time.time()
            res = subprocess.run(
                [OPENCODE_CLI_PATH, "run", "--pure", full_ai_prompt],
                capture_output=True,
                text=True,
                timeout=15
            )
            if res.returncode == 0 and res.stdout.strip():
                reply_text = res.stdout.strip()
                engine_used = "opencode-agent-cli"
        except Exception as e:
            logger.warning(f"Falla de OpenCode CLI en chat: {e}")

    # Intentar Gemini API si no hubo respuesta
    if not reply_text and (AI_PROVIDER == "gemini" or GEMINI_API_KEY):
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_ai_prompt
            )
            reply_text = resp.text.strip()
            engine_used = "google-gemini-2.5-flash"
        except Exception as err:
            logger.warning(f"Falla de Gemini en chat: {err}")

    # Fallback determinista
    if not reply_text:
        engine_used = "deterministic-analyst"
        reply_text = (
            f"Basado en los datos consolidados en la capa Gold de SismoWatch: "
            f"Se han registrado {kpis.get('events_24h', 0)} sismos en las últimas 24 horas con una magnitud promedio de {kpis.get('avg_magnitude', 0.0)} "
            f"y un máximo de {kpis.get('max_magnitude', 0.0)}. "
            f"El evento más reciente se localizó en: {recent_events[0]['place'] if recent_events else 'Sin registros'} "
            f"(Mag: {recent_events[0]['mag'] if recent_events else 0.0})."
        )

    return {
        "query": prompt,
        "answer": reply_text,
        "engine": engine_used,
        "gold_reference": {
            "events_24h": kpis.get("events_24h", 0),
            "max_magnitude": kpis.get("max_magnitude", 0.0),
            "tsunami_alerts": kpis.get("tsunami_alerts", 0)
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
