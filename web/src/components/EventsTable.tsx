import React from 'react';
import { SeismicEvent } from '../types';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, MapPin, Waves } from 'lucide-react';

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
  selectedEvent,
  onSelectEvent,
}) => {
  const getMagBadge = (mag: number | null) => {
    if (!mag) return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">N/A</span>;
    if (mag >= 7.0) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">{mag.toFixed(1)}</span>;
    if (mag >= 5.0) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">{mag.toFixed(1)}</span>;
    if (mag >= 3.0) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">{mag.toFixed(1)}</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{mag.toFixed(1)}</span>;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-6 shadow">
      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white tracking-wide">Registro de Eventos Sísmicos</h3>
          <p className="text-xs text-slate-400">Datos validados y tipados en la capa Silver / Gold</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda por ubicación */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Buscar región (ej. Chile, Alaska)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtro por Magnitud */}
          <select
            value={minMagnitude ?? ''}
            onChange={(e) => onMinMagnitudeChange(e.target.value ? parseFloat(e.target.value) : undefined)}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Todas las magnitudes</option>
            <option value="2.5">&ge; 2.5 (Perceptible)</option>
            <option value="4.0">&ge; 4.0 (Moderado)</option>
            <option value="5.0">&ge; 5.0 (Fuerte)</option>
            <option value="6.0">&ge; 6.0 (Severo)</option>
          </select>

          {/* Filtro Dual Sismos / Tsunamis */}
          <select
            value={tsunamiFilter === undefined ? '' : tsunamiFilter.toString()}
            onChange={(e) => onTsunamiFilterChange(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="">Ambos (Sismos + Tsunamis)</option>
            <option value="true">🌊 Solo Alertas Tsunami</option>
            <option value="false">Solo Sismos Estándar</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Magnitud</th>
              <th className="py-2.5 px-3">Ubicación Geográfica</th>
              <th className="py-2.5 px-3">Fecha y Hora (UTC)</th>
              <th className="py-2.5 px-3">Profundidad</th>
              <th className="py-2.5 px-3">Alertas</th>
              <th className="py-2.5 px-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {events.length > 0 ? (
              events.map((ev) => {
                const isSelected = selectedEvent?.id === ev.id;
                return (
                  <tr
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">{getMagBadge(ev.mag)}</td>
                    <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">{ev.place}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(ev.time_utc).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">{ev.depth_km} km</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {ev.tsunami > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/80 shadow-sm">
                          <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> ALERTA TSUNAMI
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Sismo Normal</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Localizar en Mapa"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 ml-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 inline-block"
                          title="Ficha Oficial USGS"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No se encontraron eventos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
        <span>Total: {totalRecords} eventos registrados</span>
        <div className="flex items-center gap-2">
          <span>Página {currentPage} de {totalPages || 1}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
