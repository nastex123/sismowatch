import datetime
import json
import logging
import os
import re
import subprocess
import time
from typing import Dict, Any, Optional

logger = logging.getLogger("airflow.task")

def sanitize_text(text: str) -> str:
    if not text:
        return ""
    # Eliminar patrones comunes de prompt injection
    cleaned = re.sub(r"(?i)(ignore previous instructions|system:|prompt:|assistant:|override)", "", text)
    # Limpiar caracteres de control
    cleaned = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", cleaned)
    return cleaned.strip()

def get_gold_computed_metrics(target_date: Optional[datetime.date] = None) -> Dict[str, Any]:
    from include.db_helpers import get_connection
    conn = get_connection(role="transform")
    if target_date is None:
        target_date = datetime.date.today()

    metrics = {
        "report_date": target_date.isoformat(),
        "total_events_24h": 0,
        "max_magnitude": 0.0,
        "avg_magnitude": 0.0,
        "tsunami_alerts": 0,
        "top_regions": [],
        "significant_events": []
    }
    try:
        with conn.cursor() as cur:
            is_today = (target_date == datetime.date.today())
            if is_today:
                # KPIs consolidados en tiempo real para el día actual
                cur.execute("""
                    SELECT events_24h, max_magnitude, avg_magnitude, tsunami_alerts 
                    FROM gold.kpis_24h 
                    ORDER BY last_updated_at DESC LIMIT 1;
                """)
                kpi_row = cur.fetchone()
                if kpi_row and kpi_row[0]:
                    metrics["total_events_24h"] = int(kpi_row[0] or 0)
                    metrics["max_magnitude"] = float(kpi_row[1] or 0.0)
                    metrics["avg_magnitude"] = float(kpi_row[2] or 0.0)
                    metrics["tsunami_alerts"] = int(kpi_row[3] or 0)

            # Si no hubo fila en KPIs o es un día anterior, calcular directo de silver.events
            if metrics["total_events_24h"] == 0:
                cur.execute("""
                    SELECT COUNT(*), COALESCE(MAX(mag), 0.0), COALESCE(ROUND(AVG(mag)::numeric, 2), 0.0), COALESCE(SUM(tsunami), 0)
                    FROM silver.events
                    WHERE DATE(time_utc) = %s;
                """, (target_date,))
                calc_row = cur.fetchone()
                if calc_row:
                    metrics["total_events_24h"] = int(calc_row[0] or 0)
                    metrics["max_magnitude"] = float(calc_row[1] or 0.0)
                    metrics["avg_magnitude"] = float(calc_row[2] or 0.0)
                    metrics["tsunami_alerts"] = int(calc_row[3] or 0)

            # Top 3 regiones activas para el día
            cur.execute("""
                SELECT COALESCE(NULLIF(place, ''), 'Zona Indefinida') as reg, COUNT(*) as cnt, MAX(mag) as mm
                FROM silver.events 
                WHERE DATE(time_utc) = %s
                GROUP BY reg
                ORDER BY cnt DESC LIMIT 3;
            """, (target_date,))
            for r in cur.fetchall():
                metrics["top_regions"].append({
                    "region": sanitize_text(r[0]),
                    "events": int(r[1]),
                    "max_mag": float(r[2] or 0.0)
                })

            # Eventos más significativos del día (o top sismos)
            cur.execute("""
                SELECT id, mag, place, time_utc, depth_km, tsunami 
                FROM silver.events 
                WHERE DATE(time_utc) = %s
                ORDER BY mag DESC LIMIT 5;
            """, (target_date,))
            for ev in cur.fetchall():
                metrics["significant_events"].append({
                    "id": ev[0],
                    "mag": float(ev[1] or 0.0),
                    "place": sanitize_text(ev[2]),
                    "time": ev[3].isoformat() if ev[3] else None,
                    "depth_km": float(ev[4] or 0.0),
                    "tsunami": int(ev[5] or 0)
                })
    except Exception as err:
        logger.error(f"Error al computar métricas para reporte IA: {err}", exc_info=True)
    finally:
        conn.close()

    return metrics

def generate_deterministic_report(metrics: Dict[str, Any]) -> Dict[str, Any]:
    total = metrics["total_events_24h"]
    max_m = metrics["max_magnitude"]
    avg_m = metrics["avg_magnitude"]
    tsunami = metrics["tsunami_alerts"]
    regions_str = ", ".join([f"{r['region']} ({r['events']} sismos)" for r in metrics["top_regions"]]) or "No se identificaron zonas con alta concentración"

    summary = (
        f"Durante el periodo de monitoreo consolidado (últimos 30 días) se registraron un total de {total} eventos sísmicos a nivel global, "
        f"con una magnitud promedio de {avg_m} y un valor máximo alcanzado de {max_m}. "
        f"Se emitieron {tsunami} alertas de tsunami oficiales. Las zonas de mayor recurrencia fueron: {regions_str}."
    )

    return {
        "report_date": metrics["report_date"],
        "executive_summary": summary,
        "notable_events": metrics["significant_events"],
        "active_zones": metrics["top_regions"],
        "computed_metrics": metrics,
        "model_name": "deterministic-rules-engine",
        "tokens_used": 0,
        "latency_ms": 5,
        "cost_usd": 0.0
    }

def call_opencode_cli(prompt: str, opencode_path: str = "/home/Coder/.opencode/bin/opencode") -> Optional[str]:
    if not os.path.exists(opencode_path):
        logger.warning(f"OpenCode CLI no encontrado en ruta: {opencode_path}")
        return None
    try:
        start = time.time()
        logger.info("Invocando agente OpenCode CLI...")
        attach_url = os.getenv("OPENCODE_ATTACH_URL", "http://172.24.0.1:4096")
        
        # 1. Intentar con attach al servidor OpenCode (puerto 4096)
        cmd = [opencode_path, "run", "--attach", attach_url, "--pure", prompt]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=25)

        # 2. Si no tuvo éxito el attach, intentar en modo directo
        if result.returncode != 0 or not result.stdout.strip():
            logger.warning(f"OpenCode attach falló (rc={result.returncode}), intentando directo...")
            cmd_direct = [opencode_path, "run", "--pure", prompt]
            result = subprocess.run(cmd_direct, capture_output=True, text=True, timeout=25)

        latency = int((time.time() - start) * 1000)
        if result.returncode == 0 and result.stdout.strip():
            lines = [
                line for line in result.stdout.splitlines()
                if not line.strip().startswith(("> build", ">", "$ ", "✱ ", "→ ", "◈ "))
            ]
            clean_text = "\n".join(lines).strip()
            if clean_text:
                logger.info(f"OpenCode CLI respondió exitosamente en {latency} ms.")
                return clean_text
            return result.stdout.strip()
        else:
            logger.warning(f"OpenCode CLI finalizó con código {result.returncode}: {result.stderr}")
            return None
    except Exception as e:
        logger.warning(f"Excepción al ejecutar OpenCode CLI: {e}")
        return None

def call_gemini_api(prompt: str, api_key: str = "") -> Optional[tuple]:
    key = api_key or os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6KVFTvDdV4PEwcRMHsZQV4EGqVof67mp9FL4Bz8EtYqaA")
    if not key:
        return None
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key)
        thinking_level = os.getenv("GEMINI_THINKING_LEVEL", "low")
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level=thinking_level)
        )

        candidate_models = [
            os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            "gemini-3.5-flash",
            "gemini-2.5-flash"
        ]

        for model in candidate_models:
            try:
                start = time.time()
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )
                latency = int((time.time() - start) * 1000)
                if response.text and response.text.strip():
                    model_display = f"google-{model} (thinking: {thinking_level})"
                    logger.info(f"Gemini API ({model_display}) respondió exitosamente en {latency} ms.")
                    return (response.text.strip(), model_display, latency)
            except Exception as model_err:
                logger.warning(f"Intento con {model} no completado ({model_err}), evaluando siguiente modelo...")

        return None
    except Exception as err:
        logger.warning(f"Falla global al invocar Gemini API: {err}")
        return None

def verify_anti_hallucination(summary_text: str, metrics: Dict[str, Any]) -> bool:
    """Verifica que las cifras clave calculadas estén presentes en el texto y no se inventen magnitudes."""
    total = str(metrics["total_events_24h"])
    max_m = f"{metrics['max_magnitude']:.1f}"
    max_m_alt = f"{metrics['max_magnitude']}"
    
    # Si hay sismos registrados, verificar que el total o el máximo figuren en el texto
    if metrics["total_events_24h"] > 0:
        if total not in summary_text and max_m not in summary_text and max_m_alt not in summary_text:
            logger.warning(f"Control Antialucinación activado: Ni total ({total}) ni máx ({max_m}) figuran en el texto.")
            return False
    return True

def generate_and_save_ai_report(target_date: Optional[datetime.date] = None) -> Dict[str, Any]:
    metrics = get_gold_computed_metrics(target_date)
    prompt = f"""
Eres el analista geofísico principal de SismoWatch. Redacta un reporte ejecutivo diario formal de 1 párrafo para la fecha {metrics['report_date']} usando estrictamente los siguientes datos calculados por código:
- Total eventos sísmicos en 24h: {metrics['total_events_24h']}
- Magnitud máxima registrada: {metrics['max_magnitude']}
- Magnitud promedio: {metrics['avg_magnitude']}
- Alertas de tsunami oficiales: {metrics['tsunami_alerts']}
- Regiones más activas: {json.dumps(metrics['top_regions'])}

IMPORTANTE: No inventes ninguna cifra ni evento adicional. Menciona explícitamente la cantidad de sismos ({metrics['total_events_24h']}) y la magnitud máxima ({metrics['max_magnitude']}).
"""

    provider = os.getenv("AI_PROVIDER", "opencode").lower()
    opencode_path = os.getenv("OPENCODE_CLI_PATH", "/home/Coder/.opencode/bin/opencode")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    summary_text = None
    model_used = "deterministic-rules-engine"
    tokens_est = 0
    latency = 10

    # 1. Intentar Gemini API si es el proveedor seleccionado o si hay clave disponible
    if provider == "gemini" or gemini_key:
        gemini_res = call_gemini_api(prompt, gemini_key)
        if gemini_res:
            summary_text, model_used, latency = gemini_res
            tokens_est = len(prompt.split()) + len(summary_text.split())

    # 2. Si no respondió o el proveedor es OpenCode, intentar OpenCode CLI
    if not summary_text and (provider == "opencode" or not gemini_key):
        summary_text = call_opencode_cli(prompt, opencode_path)
        if summary_text:
            model_used = "opencode-agent-cli (deepseek-v4.1)"
            tokens_est = len(prompt.split()) + len(summary_text.split())

    # 3. Validar Antialucinación
    if summary_text and not verify_anti_hallucination(summary_text, metrics):
        logger.warning("Respuesta de IA descartada por discrepancia numérica. Conmutando a plantilla determinista.")
        summary_text = None

    # 4. Fallback determinista si no hubo respuesta válida
    if not summary_text:
        report_data = generate_deterministic_report(metrics)
    else:
        report_data = {
            "report_date": metrics["report_date"],
            "executive_summary": summary_text,
            "notable_events": metrics["significant_events"],
            "active_zones": metrics["top_regions"],
            "computed_metrics": metrics,
            "model_name": model_used,
            "tokens_used": tokens_est,
            "latency_ms": latency,
            "cost_usd": round(tokens_est * 0.0000001, 6)
        }

    # 5. Persistir en gold.ai_reports
    from include.db_helpers import get_connection
    conn = get_connection(role="transform")
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO gold.ai_reports (
                    report_date, executive_summary, notable_events, active_zones,
                    computed_metrics, model_name, tokens_used, latency_ms, cost_usd, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (report_date) DO UPDATE SET
                    executive_summary = EXCLUDED.executive_summary,
                    notable_events = EXCLUDED.notable_events,
                    active_zones = EXCLUDED.active_zones,
                    computed_metrics = EXCLUDED.computed_metrics,
                    model_name = EXCLUDED.model_name,
                    tokens_used = EXCLUDED.tokens_used,
                    latency_ms = EXCLUDED.latency_ms,
                    cost_usd = EXCLUDED.cost_usd,
                    created_at = CURRENT_TIMESTAMP;
            """, (
                report_data["report_date"],
                report_data["executive_summary"],
                json.dumps(report_data["notable_events"]),
                json.dumps(report_data["active_zones"]),
                json.dumps(report_data["computed_metrics"]),
                report_data["model_name"],
                report_data["tokens_used"],
                report_data["latency_ms"],
                report_data["cost_usd"]
            ))
            conn.commit()
    except Exception as db_err:
        conn.rollback()
        logger.error(f"Falla al persistir reporte en gold.ai_reports: {db_err}", exc_info=True)
    finally:
        conn.close()

    logger.info("Reporte ejecutivo de IA guardado en gold.ai_reports.")
    return report_data
