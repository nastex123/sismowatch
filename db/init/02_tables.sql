-- ==============================================================================
-- 02_tables.sql - Definición de Tablas Medallón (Bronze -> Silver -> Gold)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CAPA BRONZE (Datos Crudos Inalterados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bronze.raw_events (
    id VARCHAR(100) PRIMARY KEY,
    payload JSONB NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    ingestion_source VARCHAR(255) NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bronze_ingested_at ON bronze.raw_events (ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_bronze_payload_hash ON bronze.raw_events (payload_hash);

-- ------------------------------------------------------------------------------
-- 2. CAPA SILVER (Datos Limpios, Conformes, Auditados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver.events (
    id VARCHAR(100) PRIMARY KEY,
    mag NUMERIC(4, 2),
    place TEXT,
    time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    time_epoch BIGINT NOT NULL,
    updated_epoch BIGINT,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    depth_km NUMERIC(7, 2) NOT NULL,
    tsunami INT DEFAULT 0,
    sig INT DEFAULT 0,
    status VARCHAR(50),
    mag_type VARCHAR(50),
    type VARCHAR(50),
    url TEXT,
    z_score_mag NUMERIC(6, 3),
    is_swarm BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silver_time_utc ON silver.events (time_utc DESC);
CREATE INDEX IF NOT EXISTS idx_silver_mag ON silver.events (mag DESC);
CREATE INDEX IF NOT EXISTS idx_silver_coords ON silver.events (latitude, longitude);

-- Tabla de Auditoría de Registros Rechazados (No conformes con calidad)
CREATE TABLE IF NOT EXISTS silver.rejected_events (
    id BIGSERIAL PRIMARY KEY,
    raw_id VARCHAR(100),
    rejection_reason TEXT NOT NULL,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_silver_rejected_failed_at ON silver.rejected_events (failed_at DESC);

-- Métricas de Calidad de Cada Corrida de Validación
CREATE TABLE IF NOT EXISTS silver.quality_metrics (
    id BIGSERIAL PRIMARY KEY,
    batch_id VARCHAR(100) NOT NULL,
    evaluated_records INT NOT NULL,
    passed_records INT NOT NULL,
    failed_records INT NOT NULL,
    quality_score NUMERIC(5, 2) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silver_quality_executed_at ON silver.quality_metrics (executed_at DESC);

-- ------------------------------------------------------------------------------
-- 3. CAPA GOLD (Agregaciones de Negocio, KPIs, Reportes y Seguridad)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gold.kpis_24h (
    id SERIAL PRIMARY KEY,
    events_24h INT NOT NULL,
    max_magnitude NUMERIC(4, 2),
    avg_magnitude NUMERIC(4, 2),
    tsunami_alerts INT DEFAULT 0,
    quality_score NUMERIC(5, 2) DEFAULT 100.0,
    last_event_time TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gold.hourly_timeseries (
    hour_bucket TIMESTAMP WITH TIME ZONE PRIMARY KEY,
    event_count INT NOT NULL,
    avg_magnitude NUMERIC(4, 2),
    max_magnitude NUMERIC(4, 2)
);

CREATE INDEX IF NOT EXISTS idx_gold_timeseries_hour ON gold.hourly_timeseries (hour_bucket DESC);

CREATE TABLE IF NOT EXISTS gold.active_regions (
    region_name VARCHAR(255) PRIMARY KEY,
    event_count INT NOT NULL,
    max_magnitude NUMERIC(4, 2),
    last_event_time TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_gold_active_regions_count ON gold.active_regions (event_count DESC);

CREATE TABLE IF NOT EXISTS gold.detected_anomalies (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) REFERENCES silver.events(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(100) NOT NULL,
    metric_value NUMERIC(8, 3) NOT NULL,
    threshold_value NUMERIC(8, 3) NOT NULL,
    explanation TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gold_anomalies_detected_at ON gold.detected_anomalies (detected_at DESC);

CREATE TABLE IF NOT EXISTS gold.ai_reports (
    id BIGSERIAL PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    executive_summary TEXT NOT NULL,
    notable_events JSONB NOT NULL,
    active_zones JSONB NOT NULL,
    computed_metrics JSONB NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    tokens_used INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    cost_usd NUMERIC(8, 6) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gold_ai_reports_date ON gold.ai_reports (report_date DESC);

-- Tabla de Usuarios de la Plataforma (RBAC)
CREATE TABLE IF NOT EXISTS gold.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('viewer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar permisos de lectura explícitos para el rol de API sobre las tablas recién creadas
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO sismo_api;
GRANT SELECT ON silver.rejected_events TO sismo_api;
GRANT SELECT ON silver.quality_metrics TO sismo_api;
