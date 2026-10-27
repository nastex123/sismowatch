import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { TimeseriesPoint, SeismicEvent, TimeRange } from '../types';
import { TrendingUp, BarChart3, Activity, Zap, Clock } from 'lucide-react';

interface SeismicChartsProps {
  timeseries: TimeseriesPoint[];
  events: SeismicEvent[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

export const SeismicCharts: React.FC<SeismicChartsProps> = ({
  timeseries,
  events,
  timeRange = '7d',
  onTimeRangeChange
}) => {
  // 1. Distribución de magnitudes
  const magnitudeBins = useMemo(() => {
    const bins = [
      { bin: '< 2.0', count: 0, fill: '#3f3f46' },
      { bin: '2.0 - 3.9', count: 0, fill: '#52525b' },
      { bin: '4.0 - 4.9', count: 0, fill: '#71717a' },
      { bin: '5.0 - 6.4', count: 0, fill: '#fda4af' },
      { bin: '>= 6.5', count: 0, fill: '#f43f5e' },
    ];
    events.forEach((ev) => {
      const m = Number(ev.mag || 0);
      if (m < 2.0) bins[0].count++;
      else if (m < 4.0) bins[1].count++;
      else if (m < 5.0) bins[2].count++;
      else if (m < 6.5) bins[3].count++;
      else bins[4].count++;
    });
    return bins;
  }, [events]);

  // 2. Dispersión Profundidad vs Magnitud
  const scatterData = useMemo(() => {
    // Tomar una muestra representativa de hasta 120 eventos
    return events.slice(0, 120).map((ev) => ({
      mag: Number(Number(ev.mag || 0).toFixed(1)),
      depth: Math.round(Number(ev.depth_km || 0)),
      place: ev.place,
      tsunami: ev.tsunami > 0 ? 1 : 0
    }));
  }, [events]);

  // 3. Energía Sísmica Acumulada (Fórmula Gutenberg-Richter: log E = 4.8 + 1.5 M en Joules)
  const energyData = useMemo(() => {
    // Ordenar cronológicamente y calcular energía acumulada normalizada (en GigaJoules)
    const sorted = [...events].reverse().slice(0, 80);
    let cumulative = 0;
    return sorted.map((ev, index) => {
      const m = Number(ev.mag || 0);
      // Energía relativa proporcional a 10^(1.5 * M)
      const energyGigaJoules = Math.pow(10, 1.5 * m - 4);
      cumulative += energyGigaJoules;
      return {
        step: index + 1,
        cumulativeEnergy: Math.round(cumulative),
        mag: m
      };
    });
  }, [events]);

  // 4. Patrón Circadiano de Actividad (00h a 23h UTC)
  const circadianData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}h`,
      count: 0
    }));
    events.forEach((ev) => {
      if (ev.time_utc) {
        const h = new Date(ev.time_utc).getUTCHours();
        if (hours[h]) hours[h].count++;
      }
    });
    return hours;
  }, [events]);

  const formattedTimeseries = useMemo(() => {
    return timeseries.map((pt) => ({
      ...pt,
      timeLabel: new Date(pt.hour_bucket).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
    }));
  }, [timeseries]);

  const tooltipStyle = {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#e4e4e7',
    boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Gráfico 1: Serie Temporal de Frecuencia Sísmica (Widescreen col-span-2) */}
      <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 shadow-sm hover:border-zinc-700 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Frecuencia Sísmica</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {onTimeRangeChange ? (
              <div className="flex bg-black border border-zinc-850 rounded p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => onTimeRangeChange('24h')}
                  className={`px-1.5 py-0.2 rounded transition-all press-action ${timeRange === '24h' ? 'bg-zinc-900 text-rose-400 font-bold border border-rose-500/40' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  24H
                </button>
                <button
                  onClick={() => onTimeRangeChange('7d')}
                  className={`px-1.5 py-0.2 rounded transition-all press-action ${timeRange === '7d' ? 'bg-zinc-900 text-rose-400 font-bold border border-rose-500/40' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  7D
                </button>
                <button
                  onClick={() => onTimeRangeChange('30d')}
                  className={`px-1.5 py-0.2 rounded transition-all press-action ${timeRange === '30d' ? 'bg-zinc-900 text-rose-400 font-bold border border-rose-500/40' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  30D
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-rose-400 border-b border-rose-500/50 pb-0.5">
                {timeRange === '24h' ? '24 Horas' : timeRange === '7d' ? '7 Días' : '30 Días'}
              </span>
            )}
          </div>
        </div>
        <div className="h-48 w-full">
          {formattedTimeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeseries} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#18181b" />
                <XAxis dataKey="timeLabel" stroke="#52525b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="event_count" name="Sismos" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#roseGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">
              Consolidando datos temporales...
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 2: Histograma de Magnitudes */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 shadow-sm hover:border-zinc-700 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Distribución por Magnitud</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 border-b border-zinc-700 pb-0.5">Escala Richter</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={magnitudeBins} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#18181b" />
              <XAxis dataKey="bin" stroke="#52525b" tick={{ fontSize: 9 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Cantidad" radius={[2, 2, 0, 0]}>
                {magnitudeBins.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 3: Dispersión Profundidad vs Magnitud */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 shadow-sm hover:border-zinc-700 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Hipocentros (Prof. vs Mag)</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 border-b border-zinc-700 pb-0.5">Profundidad (km)</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#18181b" />
              <XAxis type="number" dataKey="mag" name="Magnitud" stroke="#52525b" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="depth" name="Profundidad" stroke="#52525b" tick={{ fontSize: 9 }} unit="km" />
              <ZAxis range={[20, 60]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Focos Sísmicos" data={scatterData} fill="#f43f5e" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 4: Curva de Energía Sísmica Acumulada */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 shadow-sm hover:border-zinc-700 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-rose-500" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Energía Sísmica Acumulada</h3>
          </div>
          <span className="text-[10px] font-mono text-rose-400 border-b border-rose-500/50 pb-0.5">GigaJoules Relativos</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={energyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#18181b" />
              <XAxis dataKey="step" stroke="#52525b" tick={{ fontSize: 9 }} label={{ value: 'Secuencia', position: 'insideBottom', offset: -4, fill: '#52525b', fontSize: 9 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="cumulativeEnergy" name="Energía Acumulada" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 5: Patrón Circadiano de Monitoreo (00h a 23h UTC) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 shadow-sm hover:border-zinc-700 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Patrón Circadiano (24h UTC)</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 border-b border-zinc-700 pb-0.5">Densidad Horaria</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={circadianData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#18181b" />
              <XAxis dataKey="hour" stroke="#52525b" tick={{ fontSize: 8 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Sismos en Franja" fill="#3f3f46" radius={[2, 2, 0, 0]}>
                {circadianData.map((entry, index) => (
                  <Cell
                    key={`circ-${index}`}
                    fill={entry.count > 500 ? '#f43f5e' : entry.count > 400 ? '#fb7185' : '#3f3f46'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
