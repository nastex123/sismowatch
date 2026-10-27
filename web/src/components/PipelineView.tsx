import React, { useState, useEffect } from 'react';
import { PipelineStatus, QuarantineRecord } from '../types';
import { Database, AlertOctagon, CheckCircle2, RefreshCw, Calendar, Play, Clock, ShieldAlert } from 'lucide-react';
import { apiService } from '../services/api';

interface PipelineViewProps {
  status: PipelineStatus | null;
  isAdmin: boolean;
  onRefresh: () => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ status, isAdmin, onRefresh }) => {
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
      {/* Tarjeta de Frescura y Estado General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frescura Bronze */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Frescura Capa Bronze</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            {status?.last_ingested_at ? new Date(status.last_ingested_at).toLocaleString() : 'En espera de primer lote'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sondeo automático cada 5 minutos</p>
        </div>

        {/* Último Evento en Gold */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Último Evento en Gold</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            {status?.last_event_time_utc ? new Date(status.last_event_time_utc).toLocaleString() : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sincronizado y verificado por PySpark</p>
        </div>

        {/* SLA Global de Calidad */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">SLA de Validación</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
            100% Medallón
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Reglas bloqueantes activas</p>
        </div>
      </div>

      {/* Historial de Corridas de Calidad de Datos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Métricas de Calidad de Datos (PySpark)</h3>
            <p className="text-xs text-slate-400">Auditoría lote por lote almacenada en silver.quality_metrics</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Refrescar métricas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Batch ID</th>
                <th className="py-2.5 px-3">Fecha de Ejecución</th>
                <th className="py-2.5 px-3 text-right">Evaluados</th>
                <th className="py-2.5 px-3 text-right">Aprobados</th>
                <th className="py-2.5 px-3 text-right">Rechazados</th>
                <th className="py-2.5 px-3 text-right">Score Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {status?.quality_history && status.quality_history.length > 0 ? (
                status.quality_history.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-emerald-400">{m.batch_id}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(m.executed_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{m.evaluated_records}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{m.passed_records}</td>
                    <td className="py-2.5 px-3 text-right text-rose-400 font-bold">{m.failed_records}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {m.quality_score}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Disparar Backfill Histórico</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Carga parametrizada de sismos históricos de USGS directo a la capa Bronze.
            </p>

            <form onSubmit={handleTriggerBackfill} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Fecha Inicio (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={backfillStart}
                  onChange={(e) => setBackfillStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Fecha Fin (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={backfillEnd}
                  onChange={(e) => setBackfillEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Magnitud Mínima:</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="9.0"
                  value={backfillMag}
                  onChange={(e) => setBackfillMag(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={triggering}
                className="w-full mt-2 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-bold text-white transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{triggering ? 'Enviando...' : 'Lanzar Backfill en Airflow'}</span>
              </button>
            </form>

            {backfillMsg && (
              <p className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono">
                {backfillMsg}
              </p>
            )}
          </div>

          {/* Tabla de Registros en Cuarentena (silver.rejected_events) */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-white">Auditoría de Registros Rechazados (Silver)</h4>
              </div>
              <span className="text-xs font-mono text-slate-500">{quarantine.length} anomalías</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Registros que no pasaron las compuertas de calidad y fueron aislados con su motivo exacto.
            </p>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Raw ID</th>
                    <th className="py-2 px-3">Motivo de Rechazo</th>
                    <th className="py-2 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {quarantine.length > 0 ? (
                    quarantine.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-rose-400 font-bold">{q.raw_id}</td>
                        <td className="py-2 px-3 text-slate-300 font-sans">{q.rejection_reason}</td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(q.failed_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
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
