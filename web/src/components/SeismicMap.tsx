import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { SeismicEvent } from '../types';
import { AlertTriangle, Compass, Layers, Waves } from 'lucide-react';

interface SeismicMapProps {
  events: SeismicEvent[];
  selectedEvent: SeismicEvent | null;
  onSelectEvent: (event: SeismicEvent) => void;
}

// Subcomponente para recentrar el mapa cuando se selecciona un evento
const MapFocusController: React.FC<{ targetCoords: [number, number] | null }> = ({ targetCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 6, { duration: 1.5 });
    }
  }, [targetCoords, map]);
  return null;
};

export const SeismicMap: React.FC<SeismicMapProps> = ({ events, selectedEvent, onSelectEvent }) => {
  // Filtro de capa: ambos (sismos y tsunamis), solo tsunamis, solo sismos
  const [viewFilter, setViewFilter] = useState<'all' | 'tsunami' | 'earthquake'>('all');

  // Centro por defecto: América / Océano Pacífico (Anillo de fuego)
  const defaultCenter: [number, number] = [15.0, -90.0];
  const targetCoords: [number, number] | null = selectedEvent ? [selectedEvent.latitude, selectedEvent.longitude] : null;

  const tsunamiEventsCount = events.filter((e) => e.tsunami > 0).length;

  const filteredEvents = events.filter((ev) => {
    if (viewFilter === 'tsunami') return ev.tsunami > 0;
    if (viewFilter === 'earthquake') return ev.tsunami === 0;
    return true;
  });

  const getMarkerColor = (mag: number | null) => {
    if (!mag) return '#64748b';
    if (mag >= 7.0) return '#ef4444'; // Rojo fuerte
    if (mag >= 5.0) return '#f97316'; // Naranja
    if (mag >= 3.0) return '#f59e0b'; // Ámbar
    return '#10b981'; // Esmeralda
  };

  const getMarkerRadius = (mag: number | null) => {
    if (!mag) return 5;
    return Math.max(5, Math.min(22, mag * 3));
  };

  return (
    <div className="relative w-full h-[450px] lg:h-[500px] rounded-xl overflow-hidden border border-slate-800 shadow-lg bg-slate-900">
      {/* Header del Mapa con Selector de Capa Dual */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs font-mono text-slate-200 flex items-center gap-2 shadow">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Focos Mostrados ({filteredEvents.length})</span>
        </div>

        <div className="bg-slate-900/95 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 text-xs flex items-center gap-1 shadow">
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              viewFilter === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ambos (Sismos + Tsunamis)
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('tsunami')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
              viewFilter === 'tsunami'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            Alertas Tsunami ({tsunamiEventsCount})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('earthquake')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              viewFilter === 'earthquake'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Solo Sismos
          </button>
        </div>
      </div>

      {/* Leyenda de Severidad y Alertas */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow flex flex-col gap-1.5 font-mono">
        <span className="font-bold text-slate-400 mb-0.5">Escala Richter y Alertas</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>&lt; 3.0 (Leve)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>3.0 - 4.9 (Moderado)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span>5.0 - 6.9 (Fuerte)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500"></span>
          <span>&ge; 7.0 (Mayor)</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-cyan-400 bg-cyan-500/30"></span>
          <span className="text-cyan-300 font-bold">Alerta de Tsunami</span>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={3}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
        />

        <MapFocusController targetCoords={targetCoords} />

        {filteredEvents.map((ev) => {
          const color = getMarkerColor(ev.mag);
          const radius = getMarkerRadius(ev.mag);
          const isSelected = selectedEvent?.id === ev.id;
          const hasTsunami = ev.tsunami > 0;

          return (
            <React.Fragment key={ev.id}>
              {/* Anillo de Onda Expansiva para Alerta de Tsunami */}
              {hasTsunami && (
                <CircleMarker
                  center={[ev.latitude, ev.longitude]}
                  radius={radius + 9}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 2,
                    dashArray: '5, 5',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.25,
                  }}
                  interactive={false}
                />
              )}

              <CircleMarker
                center={[ev.latitude, ev.longitude]}
                radius={radius}
                pathOptions={{
                  color: isSelected ? '#ffffff' : hasTsunami ? '#06b6d4' : color,
                  weight: isSelected ? 3 : hasTsunami ? 2.5 : 1.5,
                  fillColor: color,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{
                  click: () => onSelectEvent(ev),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1.5 font-sans text-slate-900 max-w-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                      <span className="font-bold text-sm text-slate-900">
                        Mag: {ev.mag ? ev.mag.toFixed(1) : 'N/A'} {ev.mag_type || ''}
                      </span>
                      {hasTsunami && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold flex items-center gap-0.5">
                          <Waves className="w-3 h-3 text-cyan-600" /> Tsunami
                        </span>
                      )}
                    </div>

                    {hasTsunami && (
                      <div className="my-1.5 px-2 py-1 rounded bg-cyan-50 border border-cyan-300 text-cyan-900 text-[11px] font-bold flex items-center gap-1.5">
                        <Waves className="w-3.5 h-3.5 text-cyan-600" />
                        <span>ALERTA DE TSUNAMI EMITIDA</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-700 font-medium mb-1">{ev.place}</p>
                    <div className="text-[11px] text-slate-500 flex flex-col gap-0.5">
                      <span>Profundidad: <strong>{ev.depth_km} km</strong></span>
                      <span>Fecha: {new Date(ev.time_utc).toLocaleString()}</span>
                      <span>Coords: {ev.latitude.toFixed(2)}, {ev.longitude.toFixed(2)}</span>
                      {ev.z_score_mag && (
                        <span className="text-amber-600 font-mono">Z-Score: {ev.z_score_mag}</span>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};
