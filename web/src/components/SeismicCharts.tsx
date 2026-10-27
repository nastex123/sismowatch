import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { TimeseriesPoint, SeismicEvent } from '../types';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface SeismicChartsProps {
  timeseries: TimeseriesPoint[];
  events: SeismicEvent[];
}

export const SeismicCharts: React.FC<SeismicChartsProps> = ({ timeseries, events }) => {
  // Procesar distribución de magnitudes para el histograma
  const magnitudeBins = [
    { bin: '0 - 2.9', count: 0, fill: '#10b981' },
    { bin: '3.0 - 4.9', count: 0, fill: '#f59e0b' },
    { bin: '5.0 - 6.9', count: 0, fill: '#f97316' },
    { bin: '>= 7.0', count: 0, fill: '#ef4444' },
  ];

  events.forEach((ev) => {
    const m = ev.mag || 0;
    if (m < 3.0) magnitudeBins[0].count++;
    else if (m < 5.0) magnitudeBins[1].count++;
    else if (m < 7.0) magnitudeBins[2].count++;
    else magnitudeBins[3].count++;
  });

  const formattedTimeseries = timeseries.map((pt) => ({
    ...pt,
    timeLabel: new Date(pt.hour_bucket).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
      {/* Gráfico 1: Serie Temporal de Frecuencia Sísmica */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5 shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Frecuencia Sísmica (Eventos / Hora)</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Últimos 7 días</span>
        </div>
        <div className="h-56 w-full">
          {formattedTimeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="event_count" name="Sismos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              Esperando acumulación de series temporales...
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 2: Histograma de Distribución por Magnitud */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5 shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Distribución por Escala de Magnitud</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Muestra Activa</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={magnitudeBins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Cantidad de Sismos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
