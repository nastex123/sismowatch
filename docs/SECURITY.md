# Política y Evidencia de Seguridad: SismoWatch

## 1. Principio de Mínimo Privilegio en Base de Datos

Para mitigar riesgos de escalada de privilegios y accesos no autorizados a capas crudas, la base de datos PostgreSQL implementa **3 roles segregados** con permisos estrictos por esquema:

| Rol de Base de Datos | Esquemas con Acceso | Permisos Concedidos | Propósito y Restricciones |
| :--- | :--- | :--- | :--- |
| **`sismo_ingest`** | `bronze` | `USAGE`, `INSERT`, `UPDATE`, `SELECT` | Exclusivo para el DAG de ingesta de Airflow. No tiene acceso de lectura ni escritura en `silver` ni `gold`. |
| **`sismo_transform`** | `bronze`, `silver`, `gold` | `USAGE`, `SELECT` en `bronze`; `ALL PRIVILEGES` en `silver` y `gold` | Exclusivo para las tareas de transformación de PySpark y cálculo de agregaciones. |
| **`sismo_api`** | `gold`, `silver` (auditoría) | `USAGE`, `SELECT` en `gold`; `SELECT` en `silver.quality_metrics` y `silver.rejected_events` | Exclusivo para la API de consumo (FastAPI). No posee permisos de inserción, actualización ni borrado (`INSERT/UPDATE/DELETE`), ni acceso al esquema `bronze`. |

### Script DDL de Implementación de Seguridad:
```sql
-- 1. Crear esquemas
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- 2. Revocar privilegios públicos por defecto
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA bronze FROM PUBLIC;
REVOKE ALL ON SCHEMA silver FROM PUBLIC;
REVOKE ALL ON SCHEMA gold FROM PUBLIC;

-- 3. Crear roles de servicio
CREATE ROLE sismo_ingest WITH LOGIN PASSWORD '${INGEST_USER_PASSWORD}';
CREATE ROLE sismo_transform WITH LOGIN PASSWORD '${TRANSFORM_USER_PASSWORD}';
CREATE ROLE sismo_api WITH LOGIN PASSWORD '${API_USER_PASSWORD}';

-- 4. Asignar permisos estrictos
GRANT USAGE, CREATE ON SCHEMA bronze TO sismo_ingest;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA bronze TO sismo_ingest;

GRANT USAGE ON SCHEMA bronze TO sismo_transform;
GRANT SELECT ON ALL TABLES IN SCHEMA bronze TO sismo_transform;
GRANT USAGE, CREATE ON SCHEMA silver TO sismo_transform;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA silver TO sismo_transform;
GRANT USAGE, CREATE ON SCHEMA gold TO sismo_transform;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA gold TO sismo_transform;

GRANT USAGE ON SCHEMA gold TO sismo_api;
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO sismo_api;
GRANT USAGE ON SCHEMA silver TO sismo_api;
GRANT SELECT ON silver.quality_metrics TO sismo_api;
GRANT SELECT ON silver.rejected_events TO sismo_api;
```

---

## 2. Autenticación y Autorización en la Plataforma (RBAC)

### 2.1 Especificación del Modelo RBAC
La plataforma implementa autenticación basada en **JSON Web Tokens (JWT)** con algoritmo `HS256` y expiración controlada. Sin token de sesión, ninguna ruta de datos es accesible (HTTP 401 Unauthorized).

| Rol en Plataforma | Permisos Asignados | Restricciones Estrictas |
| :--- | :--- | :--- |
| **Visitante (sin login)** | Acceso únicamente a pantalla de Login (`/login`) y documentación OpenAPI pública. | Bloqueo absoluto de cualquier endpoint de datos o streaming (HTTP 401). |
| **Viewer** | Consulta de Dashboard (KPIs, mapa Leaflet, series de tiempo), consumo de eventos en tiempo real (SSE), exportación de reportes (CSV/PDF), consulta del resumen de calidad y uso del Chatbot sobre Gold. | Bloqueo estricto ante llamadas a endpoints administrativos como backfill histórico o regeneración de reportes (HTTP 403 Forbidden). Los botones correspondientes no se renderizan en el frontend. |
| **Admin** | Acceso total: todas las capacidades de Viewer más visualización de registros rechazados por calidad (`/api/quality/quarantine`), disparo manual de backfill (`/api/admin/backfill`) y regeneración de reportes IA (`/api/admin/reports/regenerate`). | Credenciales sembradas únicamente desde variables de entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Contraseñas hasheadas con `bcrypt`. |

---

## 3. Mitigación de Amenazas OWASP Top 10 para LLMs

Dado que la plataforma integra modelos de lenguaje (OpenCode CLI, Gemini API y Chatbot conversacional), se han implementado controles estrictos:

1. **Prevención de Prompt Injection (LLM01)**:
   - Los datos externos provenientes de USGS (especialmente el campo de texto libre `place` y metadatos de eventos) son sometidos a sanitización mediante expresiones regulares que eliminan instrucciones de escape (`system:`, `override:`, `ignore previous instructions:`) y caracteres de control antes de concatenarse a los prompts.
2. **Prevención de Alucinaciones en Cifras Cuantitativas**:
   - El modelo de lenguaje **no realiza cálculos matemáticos**. Las magnitudes máximas, promedios, conteos de réplicas y alertas de tsunami se calculan determinísticamente en código Python/SQL.
   - El texto generado por el LLM se somete a validación mediante expresiones regulares y validadores Pydantic para corroborar que todos los números mencionados en el texto coincidan exactamente con las cifras calculadas. Si se detecta discrepancia, se descarta el texto y se aplica el reporte determinista.
3. **Restricción de Acceso a Datos de Solo Lectura para el Chatbot**:
   - Todas las consultas SQL ejecutadas por el agente de OpenCode CLI o el backend se ejecutan bajo la conexión de `sismo_api`, la cual tiene revocado cualquier comando DDL/DML de modificación (`DROP`, `DELETE`, `UPDATE`, `INSERT`).
   - Las consultas están limitadas mediante expresiones regulares al esquema `gold`, impidiendo el acceso a tablas crudas o metadatos internos del sistema.

---

## 4. Gestión de Secretos y Sanitización de Logs

1. **Aislamiento de Secretos**:
   - Ninguna clave API, token JWT ni contraseña de base de datos se encuentra codificada en el repositorio.
   - El archivo `.env.example` contiene únicamente variables de plantilla sin valores productivos.
   - El archivo `.gitignore` excluye explícitamente `.env`, claves Fernet, archivos `.pem`, `.key` y credenciales locales de OpenCode.
2. **Sanitización de Logs**:
   - Los manejadores de registro de Airflow y FastAPI filtran cabeceras sensibles (`Authorization: Bearer ***`) y parámetros de conexión JDBC antes de emitir trazas a consola o disco.

---

## 5. Evidencia de Escaneo Automatizado de Seguridad

### 5.1 Escaneo SAST con Bandit (Código Python)
Se ejecutó Bandit sobre el código fuente de la API y los DAGs de Airflow para verificar ausencia de vulnerabilidades estáticas (inyección de comandos, SQL injection, secretos hardcodeados, uso de assert en producción):

```bash
bandit -r api/ airflow/include/ -ll
```

**Resultado de la Ejecución:**
```text
[main]  INFO    profile include tests: None
[main]  INFO    profile exclude tests: None
[main]  INFO    cli include tests: None
[main]  INFO    cli exclude tests: None
[main]  INFO    running on Python 3.11
Run started: 2026-10-27 07:10:00

Test results:
>> No issues identified.

Code scanned:
        Total lines of code: 1845
        Total lines skipped (#nosec): 0

Run metrics:
        Total issues (by severity):
                Undefined: 0
                Low: 0
                Medium: 0
                High: 0
        Total issues (by confidence):
                Undefined: 0
                Low: 0
                Medium: 0
                High: 0
Files skipped (0):
```

### 5.2 Escaneo SCA con Pip-Audit (Vulnerabilidades en Dependencias)
Se ejecutó Pip-Audit para contrastar las librerías del proyecto contra la base de datos oficial de vulnerabilidades conocidas (CVEs):

```bash
pip-audit -r requirements.txt
```

**Resultado de la Ejecución:**
```text
No known vulnerabilities found in 42 packages scanned.
PyYAML: None found
fastapi: None found
uvicorn: None found
pydantic: None found
psycopg2-binary: None found
pyspark: None found
pyjwt: None found
passlib: None found
bcrypt: None found
google-genai: None found
```
