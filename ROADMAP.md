# Hoja de Ruta Tecnológica (ROADMAP): SismoWatch

Este documento proyecta la evolución técnica y de infraestructura de la plataforma **SismoWatch** para su escalabilidad a nivel de producción masiva e integración multi-región.

---

## Fase 1: Consolidación y Despliegue Local (Versión Actual 1.0.0)
- [x] Arquitectura Medallón Híbrida 100% (Bronze -> Silver -> Gold).
- [x] Orquestación declarativa con Apache Airflow (4 DAGs productivos).
- [x] Transformaciones y controles de calidad bloqueantes con PySpark en memoria.
- [x] Backend API asíncrono con FastAPI y seguridad JWT RBAC (Viewer vs Admin).
- [x] Streaming en tiempo real con Server-Sent Events (SSE) y reconexión automática.
- [x] Frontend React + Vite con Dark Mode y visualización geoespacial con Leaflet.
- [x] Chatbot interactivo con agentes OpenCode CLI y Gemini API sobre la capa Gold.
- [x] Documentación de arquitectura en Notación de Peter Chen y escaneo con Bandit/Pip-Audit.

---

## Fase 2: Escalabilidad Horizontal y Lakehouse Distribuido (v1.1.0 - Q1)
- [ ] **Migración de Bronze a Object Storage Distribuido**:
  - Reemplazo del volumen local por integración nativa con buckets de **Amazon S3** o **Google Cloud Storage (GCS)** con ciclo de vida automático a almacenamiento frío (*Glacier / Archive*).
- [ ] **Tablas Delta Lake / Apache Iceberg**:
  - Implementación del formato Delta Lake en la capa Bronze y Silver para habilitar transacciones ACID, Time Travel (auditoría temporal histórica) y optimización *Z-Ordering* sobre coordenadas espaciales.
- [ ] **Clúster Apache Spark Dedicado**:
  - Despliegue de Spark en modo Standalone o en Amazon EMR / Dataproc con auto-escalado dinámico según el volumen de eventos sísmicos recibidos.

---

## Fase 3: Geoespacial Avanzado y Optimización de Consultas (v1.2.0 - Q2)
- [ ] **Extensión PostGIS**:
  - Habilitación de PostGIS en PostgreSQL para indexación espacial R-Tree (`GIST`), cálculo de distancias geodésicas en milisegundos y cruce con capas de infraestructuras críticas (hospitales, puentes, presas).
- [ ] **Caché en Memoria con Redis**:
  - Implementación de capa de caché Redis para las consultas de KPIs de los últimos 15 minutos en Gold, absorbiendo picos de concurrencia ciudadana ante sismos de gran magnitud.
- [ ] **WebSockets Bidireccionales para Alertas Push**:
  - Canal de notificaciones push prioritarias para dispositivos móviles ante eventos con alerta confirmada de tsunami.

---

## Fase 4: Inteligencia Artificial Multimodal y Modelos Predictivos (v2.0.0 - Q3)
- [ ] **Modelos de Aprendizaje Profundo para Estimación de Daños**:
  - Integración de modelos de redes neuronales convolucionales sobre mapas de calor sísmico para predecir intensidad instrumental Mercalli modificada (MMI).
- [ ] **Agentes Autónomos Multi-herramienta (LangGraph / OpenCode Agent Swarm)**:
  - Expansión del agente de OpenCode para generar análisis correlacionados cruzando el catálogo sísmico de USGS con fuentes meteorológicas y satelitales en tiempo real.
