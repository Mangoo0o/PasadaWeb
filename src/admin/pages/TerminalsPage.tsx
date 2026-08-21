import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Check, Crosshair } from 'lucide-react';
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
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <MapPin size={28} /> TODA Terminals & Barangay Locations
          </h2>
          <p className="page-subtitle">
            Configure municipal terminal coordinates, operational codes, & dispatch geofence zones.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} /> Add New Terminal
        </button>
      </div>

      {/* Terminal Grid & Map */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24, alignItems: 'start' }}>
        {/* Terminal Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 4 }}>
          {terminals.length === 0 ? (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              No terminals registered yet. Click "Add New Terminal" to register one.
            </div>
          ) : (
            terminals.map((t) => (
              <div
                key={t.id}
                className="glass-card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--accent-primary)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.name}</span>
                    <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                      {t.code || 'NO-CODE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Coordinates: {t.lat.toFixed(4)}, {t.lng.toFixed(4)} • Radius: {t.coverage_radius_km || 3.0} km
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                    ● {t.active_drivers_count || 8} Active Tricycles Dispatched
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEdit(t)}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit size={14} /> Edit
                </button>
              </div>
            ))
          )}
        </div>

        {/* Interactive GIS Overview Map */}
        <div className="glass-card" style={{ padding: 18, height: '580px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Terminal Geofence Coverage Map</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click map to preview coordinates</span>
          </div>

          <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
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

      {/* Add/Edit Terminal Modal with 2-Column Layout (Map Left, Inputs Right) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880, width: '92%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={20} color="var(--accent-primary)" />
                {selectedTerminal ? 'Edit Terminal Information' : 'Register New TODA Terminal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 24,
                  alignItems: 'start'
                }}>
                  {/* LEFT COLUMN: Map Pin Picker */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
                        <Crosshair size={16} color="var(--accent-primary)" />
                        <span>Pin Location on Map</span>
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--info)', fontWeight: 600 }}>
                        Drag pin or click map
                      </span>
                    </div>

                    <div style={{
                      height: 340,
                      width: '100%',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '2px solid var(--border-color)',
                      position: 'relative',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}>
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

                    <div style={{
                      marginTop: 8,
                      padding: '6px 12px',
                      background: 'var(--bg-primary)',
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)'
                    }}>
                      <span>Selected: <strong style={{ color: 'var(--text-main)' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</strong></span>
                      <span>Geofence: <strong style={{ color: 'var(--accent-primary)' }}>{coverageRadius} km</strong></span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Form Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Terminal Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Payocpoc Sur TODA Terminal"
                        className="input-field"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Terminal Route Code</label>
                      <input
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g. PAY-04"
                        className="input-field"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={lat}
                          onChange={(e) => setLat(parseFloat(e.target.value))}
                          className="input-field"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={lng}
                          onChange={(e) => setLng(parseFloat(e.target.value))}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Dispatch Geofence Radius</label>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-pasada-navy)' }}>
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
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: 4 }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        <span>0.5 km (Hub)</span>
                        <span>5.0 km (Town)</span>
                        <span>10.0 km (Municipal)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Save Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

