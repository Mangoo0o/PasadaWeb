import React, { useState, useEffect } from 'react';
import { Compass, Plus, Edit, QrCode, Check, Crosshair, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TouristSpot } from '../types';
import { FileUploader } from '../components/ui/FileUploader';

interface TouristSpotsPageProps {
  spots: TouristSpot[];
  onAddSpot: (spot: TouristSpot) => void;
  onUpdateSpot: (spot: TouristSpot) => void;
}

const spotMarkerIcon = L.divIcon({
  className: 'spot-map-marker',
  html: `<div style="background:#006688;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid #00C1FD;box-shadow:0 4px 14px rgba(0,102,136,0.5);cursor:grab;">📍</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

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

function SpotModalMapLocationPicker({
  lat,
  lng,
  onLocationChange
}: {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      <MapInvalidateSize />
      <Marker
        position={[lat, lng]}
        icon={spotMarkerIcon}
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
            📍 Pinned Destination Point<br />
            <span style={{ color: '#006688' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export const TouristSpotsPage: React.FC<TouristSpotsPageProps> = ({ 
  spots, onAddSpot, onUpdateSpot 
}) => {
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [lat, setLat] = useState(16.5410);
  const [lng, setLng] = useState(120.3720);
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState('fil');
  const [category, setCategory] = useState('Agritourism');

  const handleOpenAdd = () => {
    setSelectedSpot(null);
    setName('');
    setDescription('');
    setOpeningHours('08:00 AM - 05:00 PM');
    setLat(16.5410);
    setLng(120.3720);
    setAudioUrl('');
    setLanguage('fil');
    setCategory('Agritourism');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: TouristSpot) => {
    setSelectedSpot(s);
    setName(s.name);
    setDescription(s.description);
    setOpeningHours(s.opening_hours);
    setLat(s.lat);
    setLng(s.lng);
    setAudioUrl(s.audio_url || '');
    setLanguage(s.language || 'fil');
    setCategory(s.category || 'Agritourism');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSpot) {
      onUpdateSpot({
        ...selectedSpot,
        name,
        description,
        opening_hours: openingHours,
        lat,
        lng,
        audio_url: audioUrl,
        language,
        category
      });
    } else {
      onAddSpot({
        id: `ts-${Date.now()}`,
        name,
        description,
        opening_hours: openingHours,
        lat,
        lng,
        qr_code_ref: `PASADA-SPOT-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
        audio_url: audioUrl,
        language,
        category
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Compass size={28} /> Tourist Attractions & Multi-Language Audio Guide
          </h2>
          <p className="page-subtitle">
            Manage Bauang tourism destinations, upload official spoken audio guides, & generate QR landmarks.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} /> Add Tourist Destination
        </button>
      </div>

      {/* Spots Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20
      }}>
        {spots.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
            No tourist destinations registered in database yet.
          </div>
        ) : (
          spots.map((spot) => (
            <div key={spot.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {(spot.cover_image_url || spot.image_url) && (
                <div style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={spot.cover_image_url || spot.image_url}
                    alt={spot.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'var(--bg-glass)',
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {spot.category || 'Attraction'}
                  </div>
                </div>
              )}

              <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{spot.name}</h3>
                  <button
                    onClick={() => { setSelectedSpot(spot); setIsQRModalOpen(true); }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: 6 }}
                    title="Generate QR Signage"
                  >
                    <QrCode size={16} />
                  </button>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 14px', flex: 1 }}>
                  {spot.description}
                </p>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
                  <div>⏰ Hours: <strong>{spot.opening_hours}</strong></div>
                  <div>🌐 Language: <strong style={{ textTransform: 'uppercase' }}>{spot.language || 'fil'}</strong></div>
                  {spot.audio_url && (
                    <div style={{ color: 'var(--success)', fontWeight: 600 }}>
                      🎧 Audio Tour Configured
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => handleOpenEdit(spot)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit size={14} /> Edit Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Destination Modal with 2-Column Layout (Map Left, Inputs Right) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880, width: '92%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={20} color="var(--accent-primary)" />
                {selectedSpot ? 'Edit Destination Details' : 'Register New Tourist Spot'}
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
                        <span>Pin Landmark on Map</span>
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--info)', fontWeight: 600 }}>
                        Drag pin or click map
                      </span>
                    </div>

                    <div style={{
                      height: 320,
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

                        <SpotModalMapLocationPicker
                          lat={lat}
                          lng={lng}
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
                      <span>Category: <strong style={{ color: 'var(--accent-primary)' }}>{category}</strong></span>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <FileUploader
                        bucketName="tourist-audio"
                        accept="audio/*,.mp3,.wav,.m4a"
                        label="Spoken Audio Guide (MP3/WAV)"
                        currentUrl={audioUrl}
                        onUploadComplete={(url) => setAudioUrl(url)}
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Form Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Destination Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Lomboy Grape Farm"
                        className="input-field"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input-field"
                      >
                        <option value="Agritourism">Agritourism / Grape Picking</option>
                        <option value="Beach & Nature">Beach & Nature</option>
                        <option value="Heritage Site">Heritage Site / Historical Church</option>
                        <option value="Food & Culture">Food & Culture</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Description & Heritage Notes</label>
                      <textarea
                        rows={3}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detailed history and highlights..."
                        className="input-field"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Opening Hours</label>
                      <input
                        type="text"
                        required
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                        placeholder="e.g. 07:00 AM - 05:00 PM Daily"
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
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Signage Export Modal */}
      {isQRModalOpen && selectedSpot && (
        <div className="modal-overlay" onClick={() => setIsQRModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Tourist Landmark QR Plaque</h3>
              <button onClick={() => setIsQRModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', background: '#fff', color: '#191c1e', padding: 24 }}>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#00346F' }}>
                PASADAGUIDE TOURIST QR
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
                {selectedSpot.name}
              </div>

              <div style={{ margin: '20px auto', display: 'inline-block', padding: 16, background: '#f8fafc', borderRadius: 16, border: '2px solid #e2e8f0' }}>
                <QRCodeSVG
                  value={`https://pasadaguide.ph/spot/${selectedSpot.id}`}
                  size={180}
                  level="H"
                />
              </div>

              <p style={{ fontSize: '0.78rem', color: '#444' }}>
                Print and mount this official QR plaque at landmark entrance for instant passenger audio playback and regulated tricycle fare calculation.
              </p>
            </div>

            <div className="modal-footer">
              <button onClick={() => window.print()} className="btn btn-secondary btn-sm">Print Plaque</button>
              <button onClick={() => setIsQRModalOpen(false)} className="btn btn-primary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
