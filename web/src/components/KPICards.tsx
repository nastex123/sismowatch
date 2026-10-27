import React from 'react';
import { Activity, Flame, BarChart2, Waves, CheckCircle2, Clock } from 'lucide-react';
import { KPIStats, TimeRange } from '../types';

interface KPICardsProps {
  kpis: KPIStats | null;
  loading: boolean;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onTsunamiClick?: () => void;
  isTsunamiFilterActive?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({
  kpis,
  loading,
  timeRange = '24h',
  onTimeRangeChange,
  onTsunamiClick,
  isTsunamiFilterActive
}) => {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-950 border border-zinc-900 animate-pulse p-4 rounded" />
        ))}
      </div>
    );
  }

  const rangeLabel = timeRange === '24h' ? '24 Horas' : timeRange === '7d' ? '7 Días' : '30 Días';
  const rangeShort = timeRange === '24h' ? '24H' : timeRange === '7d' ? '7D' : '30D';
  const count = kpis.events_count ?? kpis.events_24h ?? 0;

  const getMagUnderline = (mag: number | string) => {
    const val = Number(mag || 0);
    if (val >= 7.0) return 'text-rose-400 border-b border-rose-500/90';
    if (val >= 5.0) return 'text-rose-300 border-b border-rose-400/70';
    if (val >= 3.0) return 'text-zinc-300 border-b border-zinc-500/70';
    return 'text-zinc-400 border-b border-zinc-600/50';
  };

  return (
    <div className="space-y-2 mb-6">
      {/* Selector Rápido Local en el bloque de KPIs */}
      {onTimeRangeChange && (
        <div className="flex items-center justify-between text-xs font-mono px-1">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span className="text-[11px] uppercase tracking-wider text-zinc-300">
              Métricas Consolidadas ({rangeLabel})
            </span>
          </div>
          <div className="flex items-center bg-zinc-950 border border-zinc-900 rounded p-0.5 text-[10px]">
            <button
              onClick={() => onTimeRangeChange('24h')}
              className={`px-2 py-0.5 rounded transition-all press-action font-bold ${
                timeRange === '24h'
                  ? 'bg-zinc-900 text-rose-400 border border-rose-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              24H
            </button>
            <button
              onClick={() => onTimeRangeChange('7d')}
              className={`px-2 py-0.5 rounded transition-all press-action font-bold ${
                timeRange === '7d'
                  ? 'bg-zinc-900 text-rose-400 border border-rose-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => onTimeRangeChange('30d')}
              className={`px-2 py-0.5 rounded transition-all press-action font-bold ${
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Sismos */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Total Sismos ({rangeShort})
            </span>
            <Activity className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono">
            {Number(count).toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="border-b border-zinc-700 pb-0.5 text-zinc-300 font-mono text-[10px]">USGS Global</span>
            <span>Capa Gold</span>
          </p>
        </div>

        {/* Magnitud Máxima */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Mag. Máxima ({rangeShort})
            </span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono">
              {Number(kpis.max_magnitude || 0).toFixed(1)}
            </span>
            <span className={`text-[11px] font-mono pb-0.5 ${getMagUnderline(kpis.max_magnitude)}`}>
              Richter
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Pico máximo en ventana</p>
        </div>

        {/* Magnitud Promedio */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Mag. Promedio ({rangeShort})
            </span>
            <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono">
            {Number(kpis.avg_magnitude || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Media analítica ponderada</p>
        </div>

        {/* Alertas de Tsunami */}
        <div
          onClick={onTsunamiClick}
          className={`bg-zinc-950 border rounded p-4 shadow-sm transition-all cursor-pointer press-action ${
            isTsunamiFilterActive
              ? 'border-rose-500/80 bg-zinc-900/50'
              : 'border-zinc-900 hover:border-zinc-800'
          }`}
          title="Clic para filtrar y ver alertas de tsunami"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Tsunami ({rangeShort})
            </span>
            <Waves className={`w-3.5 h-3.5 ${Number(kpis.tsunami_alerts || 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-zinc-600'}`} />
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono flex items-baseline gap-2">
            {Number(kpis.tsunami_alerts || 0)}
            {isTsunamiFilterActive && (
              <span className="text-[10px] font-mono text-rose-300 border-b border-rose-500 pb-0.5">
                FILTRADO
              </span>
            )}
          </div>
          <p className={`text-[11px] mt-1 ${Number(kpis.tsunami_alerts || 0) > 0 ? 'text-rose-300 font-bold' : 'text-zinc-500'}`}>
            {Number(kpis.tsunami_alerts || 0) > 0 ? `${kpis.tsunami_alerts} evento(s) activos` : 'Sin alertas activas'}
          </p>
        </div>

        {/* SLA de Calidad de Datos */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Calidad PySpark</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono">
              {Number(kpis.quality_score || 0).toFixed(1)}
            </span>
            <span className="text-xs text-rose-400 font-mono font-bold">%</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span className="truncate">Sinc. {new Date(kpis.last_updated_at).toLocaleTimeString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
