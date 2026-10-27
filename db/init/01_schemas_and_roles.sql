-- ==============================================================================
-- 01_schemas_and_roles.sql - Creación de Esquemas Medallón y Roles Segregados
-- ==============================================================================

-- 1. Creación de Esquemas Medallón
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- 2. Revocación de privilegios públicos por defecto para aislar seguridad
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA bronze FROM PUBLIC;
REVOKE ALL ON SCHEMA silver FROM PUBLIC;
REVOKE ALL ON SCHEMA gold FROM PUBLIC;

-- 3. Creación idempotente de roles de servicio
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sismo_ingest') THEN
        CREATE ROLE sismo_ingest WITH LOGIN PASSWORD 'IngestSecurePass2026!';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sismo_transform') THEN
        CREATE ROLE sismo_transform WITH LOGIN PASSWORD 'TransformSecurePass2026!';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sismo_api') THEN
        CREATE ROLE sismo_api WITH LOGIN PASSWORD 'ApiSecurePass2026!';
    END IF;
END $$;

-- 4. Asignación estricta de permisos por esquema (Mínimo Privilegio)

-- Rol Ingest: Escritura y lectura únicamente sobre el esquema Bronze
GRANT USAGE, CREATE ON SCHEMA bronze TO sismo_ingest;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bronze TO sismo_ingest;
ALTER DEFAULT PRIVILEGES IN SCHEMA bronze GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sismo_ingest;

-- Rol Transform: Lectura sobre Bronze; Control total sobre Silver y Gold
GRANT USAGE ON SCHEMA bronze TO sismo_transform;
GRANT SELECT ON ALL TABLES IN SCHEMA bronze TO sismo_transform;
ALTER DEFAULT PRIVILEGES IN SCHEMA bronze GRANT SELECT ON TABLES TO sismo_transform;

GRANT USAGE, CREATE ON SCHEMA silver TO sismo_transform;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA silver TO sismo_transform;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT ALL PRIVILEGES ON TABLES TO sismo_transform;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA silver TO sismo_transform;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT ALL PRIVILEGES ON SEQUENCES TO sismo_transform;

GRANT USAGE, CREATE ON SCHEMA gold TO sismo_transform;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA gold TO sismo_transform;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL PRIVILEGES ON TABLES TO sismo_transform;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA gold TO sismo_transform;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL PRIVILEGES ON SEQUENCES TO sismo_transform;

-- Rol API: Solo lectura SELECT sobre Gold y tablas de auditoría en Silver
GRANT USAGE ON SCHEMA gold TO sismo_api;
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO sismo_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT SELECT ON TABLES TO sismo_api;

GRANT USAGE ON SCHEMA silver TO sismo_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT SELECT ON TABLES TO sismo_api;
