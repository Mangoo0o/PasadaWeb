import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Check, Crosshair, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Terminal } from '../types';

interface TerminalsPageProps {
  terminals: Terminal[];
  onAddTerminal: (terminal: Terminal) => void;
  onUpdateTerminal: (terminal: Terminal) => void;
}

const terminalMarkerIcon = L.divIcon({
  className: 'terminal-map-marker',
  html: `<div style="background:#00346F;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid #00C1FD;box-shadow:0 4px 14px rgba(0,52,111,0.5);cursor:grab;">📍</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

// Map click handler helper for the background overview map
function MapClickLocationPicker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Invalidate Leaflet sizing when loaded inside dynamic modal
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Interactive Pin & Geofence Picker inside Modal
function ModalMapLocationPicker({
  lat,
  lng,
  radiusKm,
  onLocationChange
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      <MapInvalidateSize />
      <Marker
        position={[lat, lng]}
        icon={terminalMarkerIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng);
          },
        }}
      >
        <Popup>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
            📍 Pinned Terminal Point<br />
            <span style={{ color: '#006688' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={[lat, lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#004A99', fillColor: '#00C1FD', fillOpacity: 0.15, weight: 2 }}
      />
    </>
  );
}

export const TerminalsPage: React.FC<TerminalsPageProps> = ({ 
  terminals, onAddTerminal, onUpdateTerminal 
}) => {
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lat, setLat] = useState(16.5323);
  const [lng, setLng] = useState(120.3328);
  const [coverageRadius, setCoverageRadius] = useState(3.5);

  const handleOpenAdd = () => {
    setSelectedTerminal(null);
    setName('');
    setCode(`TRM-${terminals.length + 1}`);
    setLat(16.5323);
    setLng(120.3328);
    setCoverageRadius(3.5);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Terminal) => {
    setSelectedTerminal(t);
    setName(t.name);
    setCode(t.code || `TRM-${t.id}`);
    setLat(t.lat);
    setLng(t.lng);
    setCoverageRadius(t.coverage_radius_km || 3.5);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTerminal) {
      onUpdateTerminal({
        ...selectedTerminal,
        name,
        code,
        lat,
        lng,
        coverage_radius_km: coverageRadius
      });
    } else {
      onAddTerminal({
        id: `t-${Date.now()}`,
        name,
        code,
        lat,
        lng,
        active_drivers_count: 0,
        coverage_radius_km: coverageRadius
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6">
      {/* Stitch Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <MapPin size={24} />
            </span>
            <span>TODA Terminals &amp; Barangay Locations</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Configure municipal terminal coordinates, operational codes, &amp; dispatch coverage.
          </p>
        </div>

        <button 
          onClick={handleOpenAdd} 
          className="h-9 px-4 rounded-md bg-[#0052d1] hover:bg-[#0044b3] text-white font-bold text-xs shadow-md shadow-[#0052d1]/20 transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <Plus size={15} /> Add New Terminal
        </button>
      </div>

      {/* Terminal Grid & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Terminal Cards List (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {terminals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow">
              No terminals registered yet. Click "Add New Terminal" to register one.
            </div>
          ) : (
            terminals.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">{t.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-[#0052d1] dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                      {t.code || 'NO-CODE'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    GPS: {t.lat.toFixed(4)}°, {t.lng.toFixed(4)}° • Radius: {t.coverage_radius_km || 3.0} km
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 tabular-nums">
                    ● {t.active_drivers_count || 8} Active Tricycles Dispatched
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEdit(t)}
                  className="h-8 px-3 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer shrink-0 ml-2 inline-flex items-center gap-1"
                >
                  <Edit size={13} /> Edit
                </button>
              </div>
            ))
          )}
        </div>

        {/* Interactive GIS Overview Map (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow h-[560px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Terminal Geofence Coverage Map</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Click map to preview coordinates</span>
          </div>

          <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }}>
            <MapContainer
              center={[16.5333, 120.3333]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickLocationPicker
                onLocationSelect={(clickedLat, clickedLng) => {
                  setLat(clickedLat);
                  setLng(clickedLng);
                }}
              />

              {terminals.map(t => (
                <React.Fragment key={t.id}>
                  <Marker position={[t.lat, t.lng]} icon={terminalMarkerIcon}>
                    <Popup>
                      <div style={{ padding: 2 }}>
                        <strong>{t.name}</strong>
                        <div style={{ fontSize: '0.75rem' }}>Code: {t.code}</div>
                        <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                          Radius: {t.coverage_radius_km || 3.0} km
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[t.lat, t.lng]}
                    radius={(t.coverage_radius_km || 3.0) * 1000}
                    pathOptions={{ color: '#004A99', fillColor: '#00C1FD', fillOpacity: 0.1, weight: 1.5 }}
                  />
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Add/Edit Terminal Modal with 2-Column Layout */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content max-w-4xl w-[94%]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedTerminal ? 'Edit Terminal Information' : 'Register New TODA Terminal'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure municipal terminal coordinates, operational route code, and dispatch geofence.
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* LEFT COLUMN: Map Pin Picker */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        <Crosshair size={15} className="text-[#0052d1] dark:text-sky-400" />
                        <span>Pin Location on Map</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Drag pin or click map
                      </span>
                    </div>

                    <div className="h-72 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
                      <MapContainer
                        center={[lat, lng]}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <ModalMapLocationPicker
                          lat={lat}
                          lng={lng}
                          radiusKm={coverageRadius}
                          onLocationChange={(newLat, newLng) => {
                            setLat(newLat);
                            setLng(newLng);
                          }}
                        />
                      </MapContainer>
                    </div>

                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Selected: <strong className="text-slate-900 dark:text-white font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</strong></span>
                      <span>Geofence: <strong className="text-[#0052d1] dark:text-sky-400">{coverageRadius} km</strong></span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Terminal Station Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Central Bauang Public Market Terminal"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Terminal Route Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g. TRM-01 or PAY-04"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-mono font-bold text-[#0052d1] dark:text-sky-400 outline-none focus:border-[#0052d1]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={lat}
                          onChange={(e) => setLat(parseFloat(e.target.value))}
                          className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={lng}
                          onChange={(e) => setLng(parseFloat(e.target.value))}
                          className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          Dispatch Coverage Radius
                        </label>
                        <span className="text-xs font-black text-[#0052d1] dark:text-sky-400 bg-[#0052d1]/10 px-2 py-0.5 rounded-md">
                          {coverageRadius} km
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={coverageRadius}
                        onChange={(e) => setCoverageRadius(parseFloat(e.target.value))}
                        className="w-full accent-[#0052d1] cursor-pointer"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>0.5 km (Hub)</span>
                        <span>5.0 km (Town)</span>
                        <span>10.0 km (Municipal)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="h-9 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer inline-flex items-center transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="h-9 px-5 rounded-lg bg-[#0052d1] hover:bg-[#206afa] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#0052d1]/20"
                >
                  <Check size={15} /> Save Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

