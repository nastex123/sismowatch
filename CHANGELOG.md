# Registro de Cambios (CHANGELOG)

Todas las modificaciones notables y versiones del proyecto **SismoWatch** se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-10-27

### Añadido
- **Arquitectura Medallón Híbrida**:
  - Implementación de la capa `bronze` como almacenamiento crudo particionado en disco (`data/bronze/`) y tabla relacional `bronze.raw_events` en PostgreSQL.
  - Implementación de la capa `silver` procesada con Apache Spark (PySpark) para limpieza, tipado, Z-Score de magnitud y detección de enjambres sísmicos.
  - Auditoría de datos no conformes en `silver.rejected_events` y métricas de validación en `silver.quality_metrics`.
  - Implementación de la capa `gold` para consumo analítico: `gold.kpis_24h`, `gold.hourly_timeseries`, `gold.active_regions`, `gold.detected_anomalies` y `gold.ai_reports`.
- **Orquestación con Apache Airflow**:
  - DAG `sismowatch_ingestion`: Sondeo cada 5 minutos al feed GeoJSON de USGS con reintentos exponenciales y alertas de fallo.
  - DAG `sismowatch_transformation_quality`: Procesamiento analítico en memoria con PySpark disparado automáticamente al concluir la ingesta.
  - DAG `sismowatch_ai_report`: Generación diaria de resúmenes ejecutivos con validación antialucinaciones.
  - DAG `sismowatch_historical_backfill`: Carga parametrizada de los últimos 30 días con inserción idempotente.
- **Backend API (FastAPI)**:
  - Autenticación JWT con esquema de roles segregados (`viewer` y `admin`).
  - Canal de streaming en tiempo real mediante Server-Sent Events (SSE) en `/api/stream`.
  - Endpoints analíticos para KPIs, eventos paginados, series temporales, exportación de reportes (CSV/PDF) y auditoría de calidad.
  - Endpoint conversacional `/api/chat` para el Chatbot conectado a la capa Gold.
- **Frontend Web (React + TypeScript + Tailwind CSS)**:
  - Centro de comando sísmico profesional en Dark Mode.
  - Visualización geoespacial con mapa interactivo en Leaflet con marcadores codificados por severidad y pulso animado.
  - Gráficos interactivos de series de tiempo y distribución de magnitudes.
  - Panel lateral interactivo de Chatbot conectado a agentes de OpenCode CLI y Gemini API.
  - Indicador de estado "EN VIVO" con reconexión automática en caso de caída de red.
- **Seguridad y Control de Calidad**:
  - Matriz de mínimo privilegio en PostgreSQL con 3 roles de servicio independientes (`sismo_ingest`, `sismo_transform`, `sismo_api`).
  - Sanitización de entradas contra Prompt Injection y prevención de SQL injection.
  - Reporte de escaneo estático de seguridad con Bandit y auditoría de vulnerabilidades con Pip-Audit.
  - Suite de pruebas unitarias y de integración con Pytest.
