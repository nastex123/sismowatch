import React from 'react';
import { Activity, Flame, BarChart2, Waves, CheckCircle2, Clock } from 'lucide-react';
import { KPIStats } from '../types';

interface KPICardsProps {
  kpis: KPIStats | null;
  loading: boolean;
  onTsunamiClick?: () => void;
  isTsunamiFilterActive?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading, onTsunamiClick, isTsunamiFilterActive }) => {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse p-4" />
        ))}
      </div>
    );
  }

  const getMagColor = (mag: number) => {
    if (mag >= 7.0) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (mag >= 5.0) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (mag >= 3.0) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
      {/* Sismos en 30 Días */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Sismos (Últimos 30 Días)</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {kpis.events_24h.toLocaleString()}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
          <span className="text-emerald-400 font-medium">Historial 30 Días</span> (USGS Global)
        </p>
      </div>

      {/* Magnitud Máxima */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Magnitud Máxima</span>
          <Flame className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {kpis.max_magnitude.toFixed(1)}
          </span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getMagColor(kpis.max_magnitude)}`}>
            Richter
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Evento de mayor impacto</p>
      </div>

      {/* Magnitud Promedio */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Mag. Promedio</span>
          <BarChart2 className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {kpis.avg_magnitude.toFixed(2)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Media móvil 24h</p>
      </div>

      {/* Alertas de Tsunami */}
      <div 
        onClick={onTsunamiClick}
        className={`bg-slate-900/80 border rounded-xl p-4 shadow-sm transition-all cursor-pointer ${
          isTsunamiFilterActive 
            ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400' 
            : 'border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60'
        }`}
        title="Clic para filtrar y ver alertas de tsunami"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Alertas Tsunami</span>
          <Waves className={`w-4 h-4 ${kpis.tsunami_alerts > 0 ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
          {kpis.tsunami_alerts}
          {isTsunamiFilterActive && (
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30">
              FILTRADO
            </span>
          )}
        </div>
        <p className={`text-[11px] mt-1 font-medium ${kpis.tsunami_alerts > 0 ? 'text-cyan-300' : 'text-slate-400'}`}>
          {kpis.tsunami_alerts > 0 ? '8 eventos detectados (clic para ver)' : 'Sin alertas activas'}
        </p>
      </div>

      {/* SLA de Calidad de Datos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Calidad de Datos</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {kpis.quality_score.toFixed(1)}
          </span>
          <span className="text-xs text-emerald-400 font-bold">%</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="truncate">Act. {new Date(kpis.last_updated_at).toLocaleTimeString()}</span>
        </p>
      </div>
    </div>
  );
};
