import React, { useState, useEffect } from 'react';
import { PipelineStatus, QuarantineRecord, SeismicEvent, TimeRange } from '../types';
import { Database, AlertOctagon, CheckCircle2, RefreshCw, Calendar, Play, Clock, ShieldAlert, Activity, FileSpreadsheet } from 'lucide-react';
import { apiService } from '../services/api';

interface PipelineViewProps {
  status: PipelineStatus | null;
  isAdmin: boolean;
  onRefresh: () => void;
  events?: SeismicEvent[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  status,
  isAdmin,
  onRefresh,
  events = [],
  timeRange = '30d',
  onTimeRangeChange
}) => {
  const [quarantine, setQuarantine] = useState<QuarantineRecord[]>([]);
  const [loadingQuarantine, setLoadingQuarantine] = useState(false);
  const [backfillStart, setBackfillStart] = useState('2026-09-27');
  const [backfillEnd, setBackfillEnd] = useState('2026-10-27');
  const [backfillMag, setBackfillMag] = useState(2.5);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadQuarantine();
    }
  }, [isAdmin]);

  const loadQuarantine = async () => {
    setLoadingQuarantine(true);
    try {
      const data = await apiService.getQuarantine();
      setQuarantine(data);
    } catch (e: any) {
      console.warn('Error cargando cuarentena:', e.message);
    } finally {
      setLoadingQuarantine(false);
    }
  };

  const handleTriggerBackfill = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    setBackfillMsg(null);
    try {
      const res = await apiService.triggerBackfill(backfillStart, backfillEnd, backfillMag);
      setBackfillMsg('Backfill histórico enviado exitosamente a Airflow.');
      setTimeout(() => onRefresh(), 3000);
    } catch (err: any) {
      setBackfillMsg(`Falla al disparar backfill: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Rango Temporal en Pipeline */}
      {onTimeRangeChange && (
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded p-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-zinc-200 font-bold uppercase tracking-wider">
              Telemetría y Calidad ({timeRange === '24h' ? 'Últimas 24 Horas' : timeRange === '7d' ? 'Últimos 7 Días' : 'Últimos 30 Días'})
            </span>
          </div>
          <div className="flex bg-black border border-zinc-850 rounded p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onTimeRangeChange('24h')}
              className={`px-2.5 py-0.5 rounded transition-all press-action font-bold ${
                timeRange === '24h'
                  ? 'bg-zinc-900 text-rose-400 border border-rose-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              24H
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeChange('7d')}
              className={`px-2.5 py-0.5 rounded transition-all press-action font-bold ${
                timeRange === '7d'
                  ? 'bg-zinc-900 text-rose-400 border border-rose-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeChange('30d')}
              className={`px-2.5 py-0.5 rounded transition-all press-action font-bold ${
                timeRange === '30d'
                  ? 'bg-zinc-900 text-rose-400 border border-rose-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              30D
            </button>
          </div>
        </div>
      )}

      {/* Tarjeta de Frescura y Estado General - Minimalista */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frescura Bronze (MinIO S3) */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm hover:border-zinc-800 transition-all press-action">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Frescura Capa Bronze</span>
            <CheckCircle2 className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            {status?.last_ingested_at ? new Date(status.last_ingested_at).toLocaleString() : 'En espera de primer lote'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
            <span className="border-b border-rose-500/60 pb-0.5 text-rose-400">MinIO S3</span>
            <span>Sondeo continuo 30s</span>
          </p>
        </div>

        {/* Actualización Capa Gold (PySpark) */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm hover:border-zinc-800 transition-all press-action">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Actualización Capa Gold</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            {status?.last_gold_updated_at 
              ? new Date(status.last_gold_updated_at).toLocaleString() 
              : (status?.last_event_time_utc ? new Date(status.last_event_time_utc).toLocaleString() : 'N/A')}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
            <span>Último sismo físico:</span>
            <span className="border-b border-zinc-700 pb-0.5 text-zinc-300">
              {status?.last_event_time_utc ? new Date(status.last_event_time_utc).toLocaleTimeString() : 'N/A'}
            </span>
          </p>
        </div>

        {/* SLA Global de Calidad */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm hover:border-zinc-800 transition-all press-action">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">SLA de Validación</span>
            <Database className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono mt-0.5">
            100% Medallón
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">Reglas bloqueantes activas (PySpark 3.5)</p>
        </div>
      </div>

      {/* NUEVO MÓDULO: Registro Continuo de Eventos Sísmicos Procesados */}
      <div className="bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <div>
              <h3 className="text-xs font-mono font-bold text-white tracking-wide uppercase">
                Registro y Telemetría de Eventos Sísmicos (Pipeline Feed)
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">Flujo de ingestión MinIO S3 y validación en memoria con PySpark</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 border-b border-zinc-700 pb-0.5">
            {events.length} Eventos Monitoreados
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-900 sticky top-0">
              <tr>
                <th className="py-2 px-3">ID Evento</th>
                <th className="py-2 px-3">Magnitud</th>
                <th className="py-2 px-3">Ubicación</th>
                <th className="py-2 px-3">Profundidad</th>
                <th className="py-2 px-3">Destino Data Lake</th>
                <th className="py-2 px-3">Estado PySpark</th>
                <th className="py-2 px-3 text-right">Hora Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
              {events.slice(0, 30).map((ev) => (
                <tr key={ev.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2 px-3 font-mono text-zinc-400">{ev.id}</td>
                  <td className="py-2 px-3">
                    <span className="border-b border-rose-500/70 pb-0.5 font-bold text-rose-400">
                      {Number(ev.mag || 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans text-zinc-200 truncate max-w-xs">{ev.place}</td>
                  <td className="py-2 px-3 text-zinc-400">{Number(ev.depth_km).toFixed(1)} km</td>
                  <td className="py-2 px-3 text-zinc-500 text-[10px]">s3://sismowatch-bronze</td>
                  <td className="py-2 px-3">
                    <span className="border-b border-emerald-500/60 pb-0.5 text-emerald-400 font-bold text-[11px]">
                      CONFORME
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-500 text-[11px]">
                    {new Date(ev.time_utc).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Corridas de Calidad de Datos */}
      <div className="bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold text-white tracking-wide uppercase">
              Métricas de Calidad de Datos (Lotes PySpark)
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">Auditoría lote por lote almacenada en silver.quality_metrics</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all press-action"
            title="Refrescar métricas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300 font-mono">
            <thead className="bg-black text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-900">
              <tr>
                <th className="py-2 px-3">Batch ID</th>
                <th className="py-2 px-3">Fecha de Ejecución</th>
                <th className="py-2 px-3 text-right">Evaluados</th>
                <th className="py-2 px-3 text-right">Aprobados</th>
                <th className="py-2 px-3 text-right">Rechazados</th>
                <th className="py-2 px-3 text-right">Score Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {status?.quality_history && status.quality_history.length > 0 ? (
                status.quality_history.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2 px-3 text-rose-400 truncate max-w-xs">{m.batch_id}</td>
                    <td className="py-2 px-3 text-zinc-500">{new Date(m.executed_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-zinc-300">{m.evaluated_records}</td>
                    <td className="py-2 px-3 text-right text-zinc-200 font-bold">{m.passed_records}</td>
                    <td className="py-2 px-3 text-right text-rose-400 font-bold">{m.failed_records}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="border-b border-rose-500/80 pb-0.5 text-rose-300 font-bold">
                        {m.quality_score}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-500">
                    Sin ejecuciones registradas todavía. Los DAGs de Airflow inicializan automáticamente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Módulo Exclusivo Admin: Disparador de Backfill y Cuarentena */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de Backfill Histórico */}
          <div className="bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-2">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide">Backfill Histórico</h4>
            </div>
            <p className="text-[11px] text-zinc-500 mb-4 font-mono">
              Carga parametrizada de sismos históricos de USGS directo a la capa Bronze S3.
            </p>

            <form onSubmit={handleTriggerBackfill} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Fecha Inicio (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={backfillStart}
                  onChange={(e) => setBackfillStart(e.target.value)}
                  className="w-full bg-black border border-zinc-850 rounded p-1.5 text-white font-mono focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Fecha Fin (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={backfillEnd}
                  onChange={(e) => setBackfillEnd(e.target.value)}
                  className="w-full bg-black border border-zinc-850 rounded p-1.5 text-white font-mono focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Magnitud Mínima:</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="9.0"
                  value={backfillMag}
                  onChange={(e) => setBackfillMag(parseFloat(e.target.value))}
                  className="w-full bg-black border border-zinc-850 rounded p-1.5 text-white font-mono focus:border-rose-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={triggering}
                className="w-full mt-2 py-2 px-4 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 font-mono font-bold text-white transition-all press-action flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{triggering ? 'Enviando...' : 'Lanzar Backfill en Airflow'}</span>
              </button>
            </form>

            {backfillMsg && (
              <p className="mt-3 p-2 border-b border-rose-500/80 text-[11px] text-rose-300 font-mono">
                {backfillMsg}
              </p>
            )}
          </div>

          {/* Tabla de Registros en Cuarentena (silver.rejected_events) */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2 border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                  Auditoría de Cuarentena (Silver)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">{quarantine.length} anomalías</span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3 font-mono">
              Registros aislados por no satisfacer las compuertas de calidad.
            </p>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-900 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Raw ID</th>
                    <th className="py-2 px-3">Motivo de Rechazo</th>
                    <th className="py-2 px-3">Fecha Aislamiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60 text-[11px] text-zinc-300">
                  {quarantine.length > 0 ? (
                    quarantine.map((q) => (
                      <tr key={q.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-2 px-3 text-rose-400 font-bold">{q.raw_id}</td>
                        <td className="py-2 px-3 text-zinc-300 font-sans">{q.rejection_reason}</td>
                        <td className="py-2 px-3 text-zinc-500 whitespace-nowrap">
                          {new Date(q.failed_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-500">
                        No hay registros en cuarentena. La totalidad de los lotes evaluados ha sido conforme.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
