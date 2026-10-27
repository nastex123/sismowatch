import React from 'react';
import { SeismicEvent, TimeRange } from '../types';
import { Search, ChevronLeft, ChevronRight, MapPin, Waves, Calendar } from 'lucide-react';

interface EventsTableProps {
  events: SeismicEvent[];
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  minMagnitude: number | undefined;
  onMinMagnitudeChange: (mag: number | undefined) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  tsunamiFilter: boolean | undefined;
  onTsunamiFilterChange: (val: boolean | undefined) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  selectedEvent: SeismicEvent | null;
  onSelectEvent: (event: SeismicEvent) => void;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  totalRecords,
  currentPage,
  totalPages,
  onPageChange,
  minMagnitude,
  onMinMagnitudeChange,
  searchTerm,
  onSearchTermChange,
  tsunamiFilter,
  onTsunamiFilterChange,
  timeRange = '24h',
  onTimeRangeChange,
  selectedEvent,
  onSelectEvent,
}) => {
  const getMagUnderline = (mag: number | string | null) => {
    if (mag === null || mag === undefined) return <span className="border-b border-zinc-700 text-zinc-500 font-mono text-xs pb-0.5">N/A</span>;
    const val = Number(mag);
    if (val >= 7.0) return <span className="border-b border-rose-500 pb-0.5 text-rose-400 font-bold font-mono text-xs">{val.toFixed(1)}</span>;
    if (val >= 5.0) return <span className="border-b border-rose-400/80 pb-0.5 text-rose-300 font-bold font-mono text-xs">{val.toFixed(1)}</span>;
    if (val >= 3.0) return <span className="border-b border-zinc-500 pb-0.5 text-zinc-200 font-mono text-xs">{val.toFixed(1)}</span>;
    return <span className="border-b border-zinc-700 pb-0.5 text-zinc-400 font-mono text-xs">{val.toFixed(1)}</span>;
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 lg:p-6 shadow-sm">
      {/* Barra de Filtros Minimalista */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-5 border-b border-zinc-900 pb-4">
        <div>
          <h3 className="text-sm font-mono font-bold text-white tracking-wide uppercase">Registro de Eventos Sísmicos</h3>
          <p className="text-[11px] text-zinc-500 font-mono">
            Ventana {timeRange === '24h' ? 'Últimas 24 Horas' : timeRange === '7d' ? 'Últimos 7 Días' : 'Últimos 30 Días'} ({totalRecords} eventos)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Selector de Rango Temporal para la Tabla */}
          {onTimeRangeChange && (
            <div className="flex bg-black border border-zinc-850 rounded p-0.5 text-[11px]">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
          )}
          {/* Búsqueda por ubicación */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Filtrar por región..."
              className="w-full bg-black border border-zinc-850 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500/80 font-mono"
            />
          </div>

          {/* Filtro Dual Sismos / Tsunamis */}
          <select
            value={tsunamiFilter === undefined ? 'all' : tsunamiFilter ? 'tsunami' : 'regular'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') onTsunamiFilterChange(undefined);
              else if (val === 'tsunami') onTsunamiFilterChange(true);
              else onTsunamiFilterChange(false);
            }}
            className="bg-black border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/80 font-mono"
          >
            <option value="all">Filtro: Todos</option>
            <option value="tsunami">Solo Alertas Tsunami</option>
            <option value="regular">Solo Sismos Estándar</option>
          </select>

          {/* Filtro por Magnitud Mínima */}
          <select
            value={minMagnitude ?? ''}
            onChange={(e) => onMinMagnitudeChange(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-black border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/80 font-mono"
          >
            <option value="">Mag. Mínima</option>
            <option value="2.5">&ge; 2.5 Richter</option>
            <option value="4.0">&ge; 4.0 Moderado</option>
            <option value="5.5">&ge; 5.5 Fuerte</option>
            <option value="7.0">&ge; 7.0 Mayor</option>
          </select>
        </div>
      </div>

      {/* Tabla de Resultados - Sin Cajas Rellenas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-zinc-900 text-zinc-500 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Magnitud</th>
              <th className="py-2.5 px-3">Tipo / Alerta</th>
              <th className="py-2.5 px-3">Ubicación / Región</th>
              <th className="py-2.5 px-3">Profundidad</th>
              <th className="py-2.5 px-3">Fecha y Hora (UTC)</th>
              <th className="py-2.5 px-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
            {events.length > 0 ? (
              events.map((ev) => {
                const isSelected = selectedEvent?.id === ev.id;
                const hasTsunami = Number(ev.tsunami) > 0;

                return (
                  <tr
                    key={ev.id}
                    className={`transition-colors hover:bg-zinc-900/40 ${
                      isSelected ? 'bg-zinc-900/70 border-l-2 border-rose-500' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getMagUnderline(ev.mag)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {hasTsunami ? (
                        <span className="border-b border-rose-500 pb-0.5 text-rose-300 font-bold flex items-center gap-1">
                          <Waves className="w-3 h-3 text-rose-400" />
                          TSUNAMI
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">Estándar</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-zinc-200 max-w-xs truncate" title={ev.place}>
                      {ev.place}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                      {Number(ev.depth_km).toFixed(1)} km
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-zinc-500 text-[11px]">
                      {new Date(ev.time_utc).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectEvent(ev)}
                        className="py-1 px-2 text-[11px] rounded text-zinc-400 hover:text-rose-400 border border-zinc-850 hover:border-rose-500/50 transition-all press-action inline-flex items-center gap-1"
                        title="Localizar foco en el mapa"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Foco</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono">
                  No se encontraron eventos coincidentes con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-900 text-xs font-mono text-zinc-500">
        <div>
          Mostrando página <strong className="text-zinc-200">{currentPage}</strong> de <strong className="text-zinc-200">{totalPages}</strong> ({totalRecords.toLocaleString()} sismos catalogados)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded border border-zinc-850 hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 transition-all press-action"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 py-1 text-zinc-300">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded border border-zinc-850 hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 transition-all press-action"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
