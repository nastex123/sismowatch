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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TimeseriesPoint, SeismicEvent } from '../types';
import { TrendingUp, BarChart3, Activity, Zap, PieChart as PieIcon, Clock } from 'lucide-react';

interface SeismicChartsProps {
  timeseries: TimeseriesPoint[];
  events: SeismicEvent[];
}

export const SeismicCharts: React.FC<SeismicChartsProps> = ({ timeseries, events }) => {
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

  // 4. Proporción Alertas Tsunami vs Sismos Estándar
  const tsunamiRatioData = useMemo(() => {
    const tsunamis = events.filter((e) => e.tsunami > 0).length;
    const regulars = Math.max(0, events.length - tsunamis);
    return [
      { name: 'Sismos Estándar', value: regulars, color: '#27272a' },
      { name: 'Alertas Tsunami', value: tsunamis, color: '#f43f5e' }
    ];
  }, [events]);

  // 5. Patrón Circadiano de Actividad (00h a 23h UTC)
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
      {/* Gráfico 1: Serie Temporal de Frecuencia Sísmica */}
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Frecuencia Sísmica (Hora)</h3>
          </div>
          <span className="text-[10px] font-mono text-rose-400 border-b border-rose-500/50 pb-0.5">30 Días</span>
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
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
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
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
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
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
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

      {/* Gráfico 5: Donut de Alertas Tsunami vs Estándar */}
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <PieIcon className="w-3.5 h-3.5 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold text-zinc-100 tracking-wide uppercase">Riesgo Tsunami vs Regular</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 border-b border-zinc-700 pb-0.5">Proporción</span>
        </div>
        <div className="h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={tsunamiRatioData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={68}
                paddingAngle={4}
                stroke="#09090b"
                strokeWidth={2}
              >
                {tsunamiRatioData.map((entry, index) => (
                  <Cell key={`donut-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 6: Patrón Circadiano de Monitoreo (00h a 23h UTC) */}
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 shadow-sm hover:border-zinc-800 transition-all press-action">
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
