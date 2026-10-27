# SismoWatch - Plataforma de Monitoreo Sísmico Global y Automatización con IA

**SismoWatch** es un producto de datos integral de grado empresarial diseñado para transformar el feed público en tiempo real del **Servicio Geológico de Estados Unidos (USGS)** en una plataforma analítica automatizada, segura y de alta disponibilidad para la toma de decisiones en operaciones y gestión de riesgo.

La solución implementa una **Arquitectura 100% Medallón Híbrida (Bronze -> Silver -> Gold)**, orquestada de extremo a extremo con **Apache Airflow**, procesada analíticamente con **Apache Spark (PySpark)** en memoria, asegurada mediante **PostgreSQL con segregación de roles y JWT**, y consumida a través de una API moderna en **FastAPI** y una interfaz interactiva en **React + TypeScript + Tailwind CSS** con un **Chatbot conversacional** conectado a la capa Gold respaldado por agentes de **OpenCode CLI** y **Google Gemini**.

---

## 1. Puesta en Marcha Rápida (Un Único Comando)

El sistema completo se despliega de forma automatizada mediante Docker Compose sin necesidad de instalaciones manuales en el host.

### Paso 1: Clonar el repositorio y configurar variables de entorno
```bash
# Copiar el archivo de entorno de ejemplo
cp .env.example .env
```
*(Opcional: Si deseas utilizar la API en la nube de Google Gemini, añade tu `GEMINI_API_KEY` en el archivo `.env`. Si no la configuras, el sistema activará automáticamente el agente local de OpenCode CLI o el motor determinista de resiliencia sin interrumpir ninguna funcionalidad).*

### Paso 2: Levantar el stack completo
```bash
docker compose up -d --build
```

### Paso 3: Acceder a los servicios
- **Plataforma Web (Frontend)**: [http://localhost:3000](http://localhost:3000)
- **Documentación Interactiva de la API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Interfaz de Apache Airflow**: [http://localhost:8080](http://localhost:8080) (Usuario: `admin` | Contraseña: ver `.env`)

### Credenciales Precargadas de Demostración:
| Rol | Correo Electrónico | Contraseña por Defecto | Permisos en la Plataforma |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sismowatch.internal` | `SismoAdmin2026!` | Acceso completo, disparo de backfill, regeneración de reportes IA y auditoría de rechazos. |
| **Viewer** | `viewer@sismowatch.internal` | `SismoViewer2026!` | Acceso a Dashboard, Mapa interactivo, Streaming SSE, Reportes y Chatbot sobre Gold. |

---

## 2. Arquitectura del Sistema y Propósito

El detalle exhaustivo de la arquitectura, decisiones de diseño, modelo Chen y justificaciones técnicas se encuentra en el documento [`docs/ARQUITECTURA.md`](file:///home/Coder/Documentos/brandonr.r/prueba de desempeño/docs/ARQUITECTURA.md).

### Resumen de Capas Medallón:
- **Bronze (Capa Cruda Inalterada)**: Ingesta automatizada cada 5 minutos del feed GeoJSON de USGS hacia la tabla `bronze.raw_events` en PostgreSQL mediante *upsert* idempotente por ID de evento y hash SHA-256 (payload JSONB inalterado, sin overhead de persistencia dual en disco).
- **Silver (Capa Conforme y Limpia)**: Motor PySpark que aplica validaciones bloqueantes de rangos de coordenadas, profundidad y magnitud, detecta duplicados, calcula Z-Score y enjambres espaciales. Los registros válidos se escriben en `silver.events`, los fallidos se aíslan con su motivo en `silver.rejected_events` (auditoría), y las métricas se consolidan en `silver.quality_metrics`.
- **Gold (Capa de Negocio y Consumo)**: Vistas y agregaciones optimizadas para consulta rápida (`gold.kpis_24h`, `gold.hourly_timeseries`, `gold.active_regions`, `gold.detected_anomalies`, `gold.ai_reports`). Exclusiva capa expuesta a la API y al Chatbot.

### Robustez y Manejo de Excepciones en DAGs:
- **Manejo Granular de Try-Catch**: Prohibición de bloques `bare except / pass`. Captura jerárquica de excepciones específicas de red (`requests.Timeout`, `ConnectionError`), base de datos (`psycopg2.DatabaseError`), esquemas PySpark (`AnalysisException`) y parsing JSON.
- **Degradación Elegante**: Si la API de IA externa no responde, el bloque `except` conmuta inmediatamente al generador determinista sin abortar el pipeline.
- **Reintentos y Callbacks**: Reintentos automáticos con espera exponencial creciente (`retries=3`, `retry_delay=30s`) y activación de alertas ante fallos definitivos mediante `on_failure_callback`.

---

## 3. Implementación de Calidad de Datos

La calidad de datos no es un paso accesorio: **es una compuerta bloqueante** integrada en el pipeline de PySpark antes de que cualquier dato llegue a la capa Gold.

### Reglas de Validación Aplicadas:
1. **Completitud de Esquema**: Presencia obligatoria de `id`, `time`, y `geometry.coordinates`.
2. **Límites Geográficos**: Latitud estrictamente contenida en el intervalo \([-90.0, 90.0]\) y longitud en \([-180.0, 180.0]\).
3. **Plausibilidad Física**: Profundidad hipocentral entre \(-10.0 \text{ km}\) y \(1000.0 \text{ km}\); magnitud sísmica en escala Richter entre \(-2.0\) y \(10.0\).
4. **Unicidad e Idempotencia**: Detección de duplicados en el lote e inserciones controladas vía clave primaria en PostgreSQL.
5. **Controles de Frescura y Volumen**: Verificación de que la última carga exitosa no supere un umbral de 15 minutos y que la tasa de eventos por hora se mantenga dentro de los límites históricos esperados.

### ¿Dónde se visualizan los resultados?
- **Métricas Globales**: En el endpoint `GET /api/pipeline/status` y en la pestaña de Estado del Pipeline de la interfaz web, donde se grafica la tasa porcentual de calidad y total de registros aprobados vs. rechazados.
- **Auditoría de Rechazos (Exclusivo Admin)**: En el endpoint protegido `GET /api/quality/quarantine` y en la tabla de auditoría del frontend, detallando el identificador del evento, motivo exacto del rechazo y timestamp.

---

## 4. Seguridad y Mínimo Privilegio

La evidencia y auditoría completa de seguridad está detallada en [`docs/SECURITY.md`](file:///home/Coder/Documentos/brandonr.r/prueba de desempeño/docs/SECURITY.md).

- **Mínimo Privilegio en PostgreSQL**: 3 roles desacoplados (`sismo_ingest` para escritura en `bronze`, `sismo_transform` para lectura en `bronze` y escritura en `silver`/`gold`, y `sismo_api` con permiso exclusivo de `SELECT` en `gold`). La API jamás tiene acceso al esquema crudo.
- **Autenticación JWT y RBAC**: Tokens de sesión firmados con `HS256`. Los usuarios con rol `viewer` reciben rechazo explícito (HTTP 403) ante cualquier intento de ejecutar acciones administrativas.
- **Sanitización y OWASP**: Expresiones regulares que sanean el campo `place` antes de alimentar prompts de IA para prevenir ataques de *Prompt Injection*. Consultas SQL del chatbot restringidas a `SELECT` en `gold`.
- **Evidencia de Escaneo**:
  - **Bandit (SAST Python)**: Cero vulnerabilidades críticas o altas identificadas.
  - **Pip-Audit (SCA Dependencias)**: Cero CVEs conocidas en el árbol de dependencias.

---

## 5. Automatización con Inteligencia Artificial

El sistema implementa dos flujos autónomos de IA integrados al orquestador de Airflow:

1. **Reporte Narrativo Ejecutivo (DAG Diario / On-Demand)**:
   - **Cálculo Determinista Previo**: Python y SQL computan previamente en la capa Gold las cifras exactas (total de sismos, sismo de máxima magnitud, profundidad promedio, conteo de alertas de tsunami y top de regiones activas).
   - **Redacción Generativa**: El modelo (OpenCode CLI o Gemini) redacta una síntesis ejecutiva estructurada en JSON validado con Pydantic.
   - **Control Antialucinación**: Una rutina algorítmica comprueba que ningún número en el texto redactado difiera de las cifras calculadas por código. Si existe discrepancia o caída de red, se activa la plantilla determinista garantizando continuidad.
2. **Detección Analítica de Anomalías**:
   - Técnica híbrida basada en **Z-Score** sobre magnitudes y profundidades en ventanas móviles, combinada con **agrupamiento espacio-temporal** para identificar enjambres sísmicos inusuales. El modelo genera una explicación concisa de cada alerta detectada.
3. **Chatbot Inteligente en Frontend**:
   - Interfaz conversacional que permite formular consultas en lenguaje natural (ej. "¿Cuáles fueron los sismos mayores a 5.0 en las últimas 24 horas?").
   - El agente ejecuta consultas SQL parametrizadas de solo lectura contra `gold` y presenta la respuesta de forma clara y concisa.

---

## 6. Comunicación en Tiempo Real (Server-Sent Events - SSE)

Se seleccionó **Server-Sent Events (SSE)** en el endpoint `GET /api/stream` sobre WebSockets por las siguientes ventajas técnicas:
- **Flujo Unidireccional Óptimo**: El monitoreo sísmico transmite eventos del servidor al cliente sin requerir envío de datos bidireccional continuo desde el navegador.
- **Reconexión Automática Nativa**: La interfaz utiliza `EventSource`, el cual reconecta automáticamente con reintentos transparentes si se interrumpe la red.
- **Atraviesa Proxies y Firewalls sin Bloqueos**: Opera sobre protocolo HTTP/1.1 y HTTP/2 estándar sin la sobrecarga de puertos y handshakes de WebSockets.
- **Indicador "EN VIVO"**: La barra de navegación muestra un badge verde titilante y la hora exacta de la última actualización recibida.

---

## 7. Ejecución de Pruebas Automatizadas con Pytest

Para verificar la integridad del sistema con un solo comando:
```bash
pytest airflow/tests/ -v
```

El conjunto de pruebas valida:
1. `test_transform_geojson_to_silver`: Conversión correcta de estructura GeoJSON a registro tipado.
2. `test_airflow_dags_integrity`: Validación de que todos los DAGs se importan en Airflow sin errores de sintaxis ni dependencias circulares.
3. `test_quality_validation_rules`: Prueba de aceptación de registros válidos y descarte documentado de registros fuera de rango.
4. `test_api_rbac_authorization`: Verificación de protección de endpoints con JWT (401 sin token, 403 para viewer intentando acciones de admin).

---

## 8. Limitaciones Conocidas y Mejoras Futuras

- **Frecuencia de Ingesta**: El feed público de USGS actualiza cada minuto; la ingesta actual se configuró a 5 minutos para balancear la carga de evaluación. Puede ajustarse a 1 minuto en `dag_sismowatch_ingestion.py`.
- **Evolución a PostGIS**: Para producción a gran escala, se recomienda activar la extensión PostGIS en PostgreSQL para optimizar consultas de polígonos geográficos complejos y radios de impacto.
