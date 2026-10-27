import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { SeismicEvent } from '../types';
import { AlertTriangle, Compass, Layers } from 'lucide-react';

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
  // Centro por defecto: América / Océano Pacífico (Anillo de fuego)
  const defaultCenter: [number, number] = [15.0, -90.0];
  const targetCoords: [number, number] | null = selectedEvent ? [selectedEvent.latitude, selectedEvent.longitude] : null;

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
      {/* Header del Mapa */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs font-mono text-slate-200 flex items-center gap-2 shadow">
        <Compass className="w-4 h-4 text-emerald-400" />
        <span>Focos Sísmicos Activos ({events.length})</span>
      </div>

      {/* Leyenda de Severidad */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow flex flex-col gap-1.5 font-mono">
        <span className="font-bold text-slate-400 mb-0.5">Escala Richter</span>
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
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={3}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapFocusController targetCoords={targetCoords} />

        {events.map((ev) => {
          const color = getMarkerColor(ev.mag);
          const radius = getMarkerRadius(ev.mag);
          const isSelected = selectedEvent?.id === ev.id;

          return (
            <CircleMarker
              key={ev.id}
              center={[ev.latitude, ev.longitude]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3 : 1.5,
                fillColor: color,
                fillOpacity: 0.75,
              }}
              eventHandlers={{
                click: () => onSelectEvent(ev),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 font-sans text-slate-900 max-w-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                    <span className="font-bold text-sm text-slate-900">
                      Mag: {ev.mag ? ev.mag.toFixed(1) : 'N/A'} {ev.mag_type || ''}
                    </span>
                    {ev.tsunami > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Tsunami
                      </span>
                    )}
                  </div>
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
          );
        })}
      </MapContainer>
    </div>
  );
};
