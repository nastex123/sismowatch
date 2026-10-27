import React, { useState } from 'react';
import { AIReport } from '../types';
import { FileText, Download, Sparkles, RefreshCw, CheckCircle, Clock, DollarSign, Cpu } from 'lucide-react';
import { apiService } from '../services/api';

interface ReportsViewProps {
  reports: AIReport[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ reports, isAdmin, onRefresh }) => {
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(reports[0] || null);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setMessage(null);
    try {
      await apiService.regenerateReport();
      setMessage('Solicitud de regeneración enviada exitosamente a Airflow.');
      setTimeout(() => onRefresh(), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  const current = selectedReport || reports[0];

  return (
    <div className="space-y-6">
      {/* Barra Superior con Acciones de Exportación */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 p-4 lg:p-6 rounded shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <h2 className="text-base font-mono font-bold text-white tracking-wide uppercase">Resúmenes Ejecutivos con IA</h2>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Reportes generados automáticamente sobre la capa Gold con aserciones antialucinación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Descarga CSV */}
          <a
            href="/api/reports/export?format=csv"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-850 hover:border-zinc-700 transition-all press-action"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Exportar CSV</span>
          </a>

          {/* Descarga PDF */}
          <a
            href="/api/reports/export?format=pdf"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-850 hover:border-zinc-700 transition-all press-action"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Exportar PDF</span>
          </a>

          {/* Botón Admin: Regenerar Reporte */}
          {isAdmin && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold transition-all press-action"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Regenerar (IA)</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3 border-b border-rose-500/80 text-xs text-rose-300 font-mono">
          {message}
        </div>
      )}

      {/* Contenido Principal: Selector Lateral y Visor de Reporte */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Historial de Reportes */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm h-fit">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-3 border-b border-zinc-900 pb-2">
            Historial Diario
          </h3>
          <div className="space-y-1">
            {reports.length > 0 ? (
              reports.map((rep) => {
                const isSelected = (current?.id === rep.id);
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`w-full text-left p-2.5 rounded text-xs font-mono transition-all press-action border-l-2 ${
                      isSelected
                        ? 'border-rose-500 bg-zinc-900 text-white font-bold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{rep.report_date}</span>
                      <span className="text-[10px] text-zinc-500">{rep.model_name.split('-')[0]}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-zinc-600 font-mono">No hay reportes disponibles.</p>
            )}
          </div>
        </div>

        {/* Visor de Reporte Activo */}
        {current ? (
          <div className="lg:col-span-3 space-y-6">
            {/* Tarjeta Principal de Síntesis */}
            <div className="bg-zinc-950 border border-zinc-900 rounded p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-4">
                <div>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Reporte Consolidado</span>
                  <h3 className="text-lg font-bold text-white font-mono">{current.report_date}</h3>
                </div>

                {/* Metadata de Inferencia */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-rose-400" />
                    <span>{current.model_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{current.latency_ms} ms</span>
                  </div>
                </div>
              </div>

              {/* Texto Ejecutivo */}
              <div>
                <h4 className="text-xs font-mono uppercase text-zinc-500 font-bold mb-2">Síntesis Analítica:</h4>
                <div className="p-4 bg-black border border-zinc-900 rounded text-xs leading-relaxed text-zinc-200 font-sans border-l-2 border-rose-500">
                  {current.executive_summary}
                </div>
              </div>

              {/* Zonas de Alta Concentración */}
              {current.active_zones && current.active_zones.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase text-zinc-500 font-bold mb-2">Zonas de Mayor Recurrencia Sísmica:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {current.active_zones.map((zone, idx) => (
                      <div key={idx} className="p-3 bg-black border border-zinc-900 rounded">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{zone.region}</div>
                        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mt-2">
                          <span>Sismos: <strong className="text-rose-400">{zone.events}</strong></span>
                          <span>Max: <strong>{zone.max_mag}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eventos Notables del Período */}
              {current.notable_events && current.notable_events.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase text-zinc-500 font-bold mb-2">Eventos Críticos / Tsunamis:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-black text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-900">
                        <tr>
                          <th className="py-2 px-3">Magnitud</th>
                          <th className="py-2 px-3">Ubicación</th>
                          <th className="py-2 px-3">Profundidad</th>
                          <th className="py-2 px-3">Tsunami</th>
                          <th className="py-2 px-3 text-right">Fecha UTC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
                        {current.notable_events.map((ev) => (
                          <tr key={ev.id} className="hover:bg-zinc-900/40">
                            <td className="py-2 px-3">
                              <span className="border-b border-rose-500 pb-0.5 text-rose-400 font-bold">
                                {ev.mag}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans text-zinc-200 truncate max-w-xs">{ev.place}</td>
                            <td className="py-2 px-3 text-zinc-400">{ev.depth_km} km</td>
                            <td className="py-2 px-3">
                              {ev.tsunami > 0 ? (
                                <span className="border-b border-rose-500 pb-0.5 text-rose-300 font-bold text-[10px]">
                                  ALERTA TSUNAMI
                                </span>
                              ) : (
                                <span className="text-zinc-600 text-[10px]">No</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-zinc-500 text-[11px]">
                              {ev.time ? new Date(ev.time).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 bg-zinc-950 border border-zinc-900 rounded p-8 text-center text-xs font-mono text-zinc-500">
            Selecciona un reporte de la lista lateral para visualizar sus detalles.
          </div>
        )}
      </div>
    </div>
  );
};
