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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 lg:p-6 rounded-xl shadow">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">Resúmenes Ejecutivos con IA</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Reportes generados automáticamente a partir de datos curados en la capa Gold con aserciones antialucinación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Descarga CSV */}
          <a
            href="/api/reports/export?format=csv"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar CSV</span>
          </a>

          {/* Descarga PDF */}
          <a
            href="/api/reports/export?format=pdf"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Exportar PDF</span>
          </a>

          {/* Botón Admin: Regenerar Reporte */}
          {isAdmin && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Regenerar Reporte (IA)</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
          {message}
        </div>
      )}

      {/* Contenido Principal: Selector Lateral y Visor de Reporte */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Historial de Reportes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">Historial Diario</h3>
          <div className="space-y-1.5">
            {reports.length > 0 ? (
              reports.map((rep) => {
                const isSelected = (current?.id === rep.id);
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-mono">{rep.report_date}</span>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[90px]">{rep.model_name}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 font-mono py-4 text-center">No hay reportes registrados aún.</p>
            )}
          </div>
        </div>

        {/* Visor Detallado */}
        <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow space-y-6">
          {current ? (
            <>
              {/* Encabezado del Reporte */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Síntesis Sísmica Global del {current.report_date}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      Modelo: <strong>{current.model_name}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Latencia: {current.latency_ms} ms
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      Costo: ${current.cost_usd.toFixed(6)}
                    </span>
                  </div>
                </div>

                <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Verificado por Código
                </span>
              </div>

              {/* Resumen Ejecutivo */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5">
                <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2">Resumen Ejecutivo</h4>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {current.executive_summary}
                </p>
              </div>

              {/* Métricas y Cifras Auditadas */}
              {current.computed_metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Sismos Totales</span>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">
                      {current.computed_metrics.total_events_24h || 0}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Magnitud Máxima</span>
                    <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                      {current.computed_metrics.max_magnitude || 0.0}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Mag. Promedio</span>
                    <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                      {current.computed_metrics.avg_magnitude || 0.0}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Alertas Tsunami</span>
                    <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                      {current.computed_metrics.tsunami_alerts || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Zonas de Mayor Actividad */}
              {current.active_zones && current.active_zones.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3">Zonas con Mayor Recurrencia</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {current.active_zones.map((zone: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg text-xs">
                        <span className="font-semibold text-slate-200 block truncate">{zone.region}</span>
                        <div className="flex items-center justify-between text-slate-400 mt-1 font-mono text-[11px]">
                          <span>{zone.events} sismos</span>
                          <span className="text-amber-400">Máx: {zone.max_mag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-sm">
              Selecciona o genera un reporte para visualizar el análisis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
