import React, { useState, useEffect } from 'react';
import { UserSession, KPIStats, SeismicEvent, TimeseriesPoint, AIReport, PipelineStatus, TimeRange } from './types';
import { apiService } from './services/api';
import { Navbar } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { SeismicMap } from './components/SeismicMap';
import { SeismicCharts } from './components/SeismicCharts';
import { EventsTable } from './components/EventsTable';
import { ReportsView } from './components/ReportsView';
import { PipelineView } from './components/PipelineView';
import { ChatbotDrawer } from './components/ChatbotDrawer';
import { LoginModal } from './components/LoginModal';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('sismowatch_session');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'pipeline'>('dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros y Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [minMagnitude, setMinMagnitude] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [tsunamiFilter, setTsunamiFilter] = useState<boolean | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);

  // Estado SSE en Vivo
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);

  // Chatbot
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Cargar datos iniciales al autenticar o cambiar timeRange
  useEffect(() => {
    if (session) {
      loadAllData();
      initSSE();
    }
  }, [session, timeRange]);

  // Recargar eventos cuando cambian los filtros
  useEffect(() => {
    if (session) {
      loadEvents();
    }
  }, [page, minMagnitude, searchTerm, tsunamiFilter, timeRange]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpisData, eventsData, tsData, repData, pipeData] = await Promise.all([
        apiService.getKPIs(timeRange).catch((err) => { console.warn('KPI fetch error:', err); return null; }),
        apiService.getEvents({ page: 1, limit: 100, min_magnitude: minMagnitude, region: searchTerm, tsunami_only: tsunamiFilter, time_range: timeRange }).catch((err) => { console.warn('Events fetch error:', err); return { items: [], total_records: 0, total_pages: 1 }; }),
        apiService.getTimeseries(timeRange).catch(() => []),
        apiService.getReports(timeRange).catch(() => []),
        apiService.getPipelineStatus(timeRange).catch(() => null)
      ]);

      if (!kpisData && eventsData.items.length === 0) {
        setError('Error de comunicación con el servicio backend (502 o conexión rechazada). Comprobando enlace...');
      } else {
        setError(null);
      }

      if (kpisData) setKpis(kpisData);
      if (eventsData) {
        setEvents(eventsData.items);
        setTotalRecords(eventsData.total_records);
        setTotalPages(eventsData.total_pages);
      }
      if (tsData) setTimeseries(tsData);
      if (repData) setReports(repData);
      if (pipeData) setPipelineStatus(pipeData);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos del sistema.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await apiService.getEvents({ page, limit: 100, min_magnitude: minMagnitude, region: searchTerm, tsunami_only: tsunamiFilter, time_range: timeRange });
      setEvents(data.items);
      setTotalRecords(data.total_records);
      setTotalPages(data.total_pages);
    } catch (e: any) {
      console.warn('Falla al recargar eventos:', e.message);
    }
  };

  // Canal SSE (Server-Sent Events) en Tiempo Real
  const initSSE = () => {
    if (!session) return;
    const eventSource = new EventSource(`/api/stream?token=${encodeURIComponent(session.token)}`);

    eventSource.onopen = () => {
      setIsLiveConnected(true);
    };

    eventSource.addEventListener('seismic_update', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        setIsLiveConnected(true);
        setLastLiveUpdate(payload.timestamp);
        if (payload.kpis && Object.keys(payload.kpis).length > 0) {
          const raw = payload.kpis;
          setKpis((prev) => ({
            ...prev,
            ...raw,
            events_24h: Number(raw.events_24h ?? prev?.events_24h ?? 0),
            max_magnitude: Number(raw.max_magnitude ?? prev?.max_magnitude ?? 0),
            avg_magnitude: Number(raw.avg_magnitude ?? prev?.avg_magnitude ?? 0),
            tsunami_alerts: Number(raw.tsunami_alerts ?? prev?.tsunami_alerts ?? 0),
            quality_score: Number(raw.quality_score ?? prev?.quality_score ?? 100),
          }));
        }
        if (payload.new_events && payload.new_events.length > 0) {
          // Incorporar eventos nuevos al inicio sin recargar página
          const sanitizedEvents = payload.new_events.map((e: any) => ({
            ...e,
            mag: e.mag !== null && e.mag !== undefined ? Number(e.mag) : null,
            latitude: Number(e.latitude ?? 0),
            longitude: Number(e.longitude ?? 0),
            depth_km: Number(e.depth_km ?? 0),
            tsunami: Number(e.tsunami ?? 0),
          }));
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const fresh = sanitizedEvents.filter((e: SeismicEvent) => !existingIds.has(e.id));
            return [...fresh, ...prev];
          });
        }
      } catch (err) {
        console.error('Error parseando payload SSE:', err);
      }
    });

    eventSource.onerror = () => {
      setIsLiveConnected(false);
    };

    return () => {
      eventSource.close();
    };
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    localStorage.setItem('sismowatch_session', JSON.stringify(newSession));
    setSession(newSession);
  };

  const handleLogout = () => {
    localStorage.removeItem('sismowatch_session');
    setSession(null);
  };

  if (!session) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col font-sans text-zinc-200">
      {/* Barra de Navegación Superior */}
      <Navbar
        session={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isLiveConnected={isLiveConnected}
        lastLiveUpdate={lastLiveUpdate}
        onLogout={handleLogout}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* Banner de Error Resiliente */}
        {error && (
          <div className="mb-6 p-3 rounded bg-zinc-950 border border-zinc-900 border-l-2 border-rose-500 flex items-center justify-between text-xs text-rose-300 font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadAllData}
              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-rose-300 font-medium transition-all press-action"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Vista 1: Dashboard de Operaciones */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <KPICards 
              kpis={kpis} 
              loading={loading}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onTsunamiClick={() => {
                setTsunamiFilter((prev) => (prev === true ? undefined : true));
                setPage(1);
              }}
              isTsunamiFilterActive={tsunamiFilter === true}
            />

            {/* Mapa Interactivo de Monitoreo */}
            <div className="w-full">
              <SeismicMap
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />
            </div>

            {/* Gráficos Analíticos (6 Diagramas) */}
            <SeismicCharts
              timeseries={timeseries}
              events={events}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />

            {/* Tabla de Eventos Filtrable */}
            <EventsTable
              events={events}
              totalRecords={totalRecords}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              minMagnitude={minMagnitude}
              onMinMagnitudeChange={(m) => {
                setMinMagnitude(m);
                setPage(1);
              }}
              searchTerm={searchTerm}
              onSearchTermChange={(s) => {
                setSearchTerm(s);
                setPage(1);
              }}
              tsunamiFilter={tsunamiFilter}
              onTsunamiFilterChange={(t) => {
                setTsunamiFilter(t);
                setPage(1);
              }}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          </div>
        )}

        {/* Vista 2: Reportes Ejecutivos IA */}
        {activeTab === 'reports' && (
          <ReportsView
            reports={reports}
            isAdmin={session.role === 'admin'}
            onRefresh={loadAllData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        )}

        {/* Vista 3: Monitor de Pipeline y Calidad de Datos */}
        {activeTab === 'pipeline' && (
          <PipelineView
            status={pipelineStatus}
            isAdmin={session.role === 'admin'}
            onRefresh={loadAllData}
            events={events}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        )}
      </main>

      {/* Botón Flotante para Abrir Chatbot - Minimalista */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-40 px-3.5 py-2.5 rounded bg-zinc-950 border border-zinc-850 hover:border-rose-500/80 text-zinc-300 hover:text-white shadow-xl flex items-center gap-2 font-mono text-xs transition-all press-action"
      >
        <MessageSquare className="w-4 h-4 text-rose-400" />
        <span className="hidden sm:inline border-b border-rose-500/60 pb-0.5">Consultar Capa Gold</span>
      </button>

      {/* Drawer del Chatbot */}
      <ChatbotDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};
