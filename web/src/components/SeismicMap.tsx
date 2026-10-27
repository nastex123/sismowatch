import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { SeismicEvent } from '../types';
import { Compass, Waves } from 'lucide-react';

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
  const targetCoords: [number, number] | null = selectedEvent ? [Number(selectedEvent.latitude), Number(selectedEvent.longitude)] : null;

  const tsunamiEventsCount = events.filter((e) => Number(e.tsunami) > 0).length;

  const filteredEvents = events.filter((ev) => {
    if (viewFilter === 'tsunami') return Number(ev.tsunami) > 0;
    if (viewFilter === 'earthquake') return Number(ev.tsunami) === 0;
    return true;
  });

  const getMarkerColor = (mag: number | string | null) => {
    const val = Number(mag || 0);
    if (val >= 7.0) return '#e11d48'; // Rosa intenso / carmesí
    if (val >= 5.0) return '#f43f5e'; // Rosa brillante
    if (val >= 3.0) return '#fda4af'; // Rosa pastel
    return '#71717a'; // Gris neutro
  };

  const getMarkerRadius = (mag: number | string | null) => {
    const val = Number(mag || 0);
    if (!val) return 4;
    return Math.max(4, Math.min(20, val * 2.8));
  };

  return (
    <div className="relative isolate z-0 w-full h-[450px] lg:h-[500px] rounded overflow-hidden border border-zinc-900 shadow-md bg-black">
      {/* Header del Mapa - Estilo Terminal Minimalista */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-3">
        <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded border border-zinc-850 text-xs font-mono text-zinc-300 flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-rose-400" />
          <span>Focos: <strong className="text-white font-mono">{filteredEvents.length}</strong></span>
        </div>

        {/* Selector de Capa - Botones de Texto con Subrayado Terminal */}
        <div className="bg-black/90 backdrop-blur-md px-2 py-1 rounded border border-zinc-850 flex items-center gap-3 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`py-1 text-[11px] transition-all press-action border-b-2 ${
              viewFilter === 'all'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Ambos (Sismos + Tsunamis)
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('tsunami')}
            className={`py-1 text-[11px] flex items-center gap-1.5 transition-all press-action border-b-2 ${
              viewFilter === 'tsunami'
                ? 'border-rose-500 text-rose-300 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Waves className="w-3 h-3 text-rose-400" />
            Alertas Tsunami ({tsunamiEventsCount})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('earthquake')}
            className={`py-1 text-[11px] transition-all press-action border-b-2 ${
              viewFilter === 'earthquake'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Solo Sismos
          </button>
        </div>
      </div>

      {/* Leyenda de Severidad Minimalista */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/90 backdrop-blur-md p-3 rounded border border-zinc-850 text-[11px] text-zinc-300 shadow flex flex-col gap-1.5 font-mono">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Severidad Richter</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#71717a]"></span>
          <span>&lt; 3.0 Menor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fda4af]"></span>
          <span>3.0 - 4.9 Moderado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
          <span>5.0 - 6.9 Fuerte</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]"></span>
          <span>&ge; 7.0 Mayor</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-850 text-rose-300 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span>Alerta Tsunami</span>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        <MapFocusController targetCoords={targetCoords} />

        {filteredEvents.map((ev) => {
          const lat = Number(ev.latitude);
          const lng = Number(ev.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const isSelected = selectedEvent?.id === ev.id;
          const hasTsunami = Number(ev.tsunami) > 0;
          const markerColor = getMarkerColor(ev.mag);
          const markerRadius = getMarkerRadius(ev.mag);

          return (
            <React.Fragment key={ev.id}>
              {/* Onda expansiva animada en rosa para alertas de tsunami */}
              {hasTsunami && (
                <CircleMarker
                  center={[lat, lng]}
                  radius={markerRadius * 2.2}
                  pathOptions={{
                    color: '#f43f5e',
                    fillColor: '#f43f5e',
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: '3, 4',
                  }}
                />
              )}

              <CircleMarker
                center={[lat, lng]}
                radius={isSelected ? markerRadius * 1.4 : markerRadius}
                pathOptions={{
                  color: isSelected ? '#ffffff' : hasTsunami ? '#f43f5e' : markerColor,
                  fillColor: markerColor,
                  fillOpacity: isSelected ? 0.95 : 0.75,
                  weight: isSelected ? 2 : hasTsunami ? 2 : 1,
                }}
                eventHandlers={{
                  click: () => onSelectEvent(ev),
                }}
              >
                <Popup>
                  <div className="p-2 font-mono text-zinc-900 max-w-xs text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-1 mb-1">
                      <span className="font-bold text-sm">
                        Mag: {ev.mag !== null && ev.mag !== undefined ? Number(ev.mag).toFixed(1) : 'N/A'} {ev.mag_type || ''}
                      </span>
                      {hasTsunami && (
                        <span className="border-b border-rose-500 pb-0.5 text-rose-700 font-bold flex items-center gap-0.5">
                          <Waves className="w-3 h-3 text-rose-600" /> Tsunami
                        </span>
                      )}
                    </div>

                    {hasTsunami && (
                      <div className="my-1.5 py-0.5 border-b border-rose-400 text-rose-700 font-bold flex items-center gap-1">
                        <Waves className="w-3.5 h-3.5 text-rose-600" />
                        <span>ALERTA DE TSUNAMI EMITIDA</span>
                      </div>
                    )}

                    <p className="text-zinc-700 font-medium mb-1">{ev.place}</p>
                    <div className="text-[11px] text-zinc-600 flex flex-col gap-0.5">
                      <span>Profundidad: <strong>{Number(ev.depth_km).toFixed(1)} km</strong></span>
                      <span>Fecha: {new Date(ev.time_utc).toLocaleString()}</span>
                      <span>Coords: {Number(ev.latitude).toFixed(2)}, {Number(ev.longitude).toFixed(2)}</span>
                      {ev.z_score_mag && (
                        <span className="text-rose-600 font-mono">Z-Score: {ev.z_score_mag}</span>
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
