import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Edit, 
  Check, 
  Plus, 
  Trash2, 
  Target, 
  Sparkles, 
  Crosshair, 
  Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LocationFare, Terminal } from '../types';
import { PDFExportButton } from '../components/ui/PDFExportButton';
import { 
  findMatchingLocationByProximity, 
  LOCATION_ICON_OPTIONS, 
  getLocationIconEmoji 
} from '../../services/fareService';

interface FareMatrixPageProps {
  locationFares: LocationFare[];
  terminals: Terminal[];
  onSaveLocationFare: (fare: Partial<LocationFare> & { location_name: string; lat: number; lng: number; standard_fare: number; icon?: string }) => void;
  onDeleteLocationFare: (id: string) => void;
}

const createAdminLocPin = (loc: LocationFare) => {
  const emoji = getLocationIconEmoji(loc.icon, loc.location_name);
  return L.divIcon({
    className: 'admin-loc-pin',
    html: `<div style="background:#00346F;color:#ffffff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid #00C1FD;box-shadow:0 3px 10px rgba(0,52,111,0.4);cursor:pointer;">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const testClickPinIcon = L.divIcon({
  className: 'admin-test-pin',
  html: `<div style="background:#dc2626;color:#ffffff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;border:2.5px solid #ffffff;box-shadow:0 3px 12px rgba(220,38,38,0.5);">🎯</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapClickTester({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Interactive Map Picker inside Modal
function ModalLocationPicker({
  lat,
  lng,
  radiusMeters,
  onLocationChange,
  icon
}: {
  lat: number;
  lng: number;
  radiusMeters: number;
  onLocationChange: (lat: number, lng: number) => void;
  icon?: string;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);

  const markerIcon = L.divIcon({
    className: 'modal-picker-pin',
    html: `<div style="background:#00346F;color:#ffffff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #00C1FD;box-shadow:0 4px 14px rgba(0,52,111,0.5);cursor:move;">${getLocationIconEmoji(icon)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  return (
    <>
      <MapInvalidateSize />
      <Circle
        center={[lat, lng]}
        radius={radiusMeters}
        pathOptions={{
          color: '#00346F',
          fillColor: '#00C1FD',
          fillOpacity: 0.22,
          weight: 2.5
        }}
      />
      <Marker
        position={[lat, lng]}
        icon={markerIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng);
          },
        }}
      />
    </>
  );
}

export const FareMatrixPage: React.FC<FareMatrixPageProps> = ({ 
  locationFares, 
  terminals, 
  onSaveLocationFare, 
  onDeleteLocationFare 
}) => {
  const [selectedFare, setSelectedFare] = useState<LocationFare | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [locationName, setLocationName] = useState('');
  const [originTerminalId, setOriginTerminalId] = useState(terminals[0]?.id || 'term-bauang-central');
  const [standardFare, setStandardFare] = useState<number>(20);
  const [discountedFare, setDiscountedFare] = useState<number>(16);
  const [proximityRadius, setProximityRadius] = useState<number>(800);
  const [lat, setLat] = useState<number>(16.5333);
  const [lng, setLng] = useState<number>(120.3333);
  const [icon, setIcon] = useState<string>('pin');
  const [notes, setNotes] = useState<string>('');

  // Interactive Tester State
  const [testPin, setTestPin] = useState<{ lat: number; lng: number } | null>({ lat: 16.5250, lng: 120.3400 });
  const [testResult, setTestResult] = useState<any>(null);

  // Run initial test match on default test pin
  useEffect(() => {
    if (testPin && locationFares.length > 0) {
      const match = findMatchingLocationByProximity(testPin.lat, testPin.lng, locationFares);
      setTestResult(match);
    }
  }, [testPin, locationFares]);

  const handleOpenAdd = () => {
    setSelectedFare(null);
    setLocationName('');
    setOriginTerminalId(terminals[0]?.id || 'term-bauang-central');
    setStandardFare(25);
    setDiscountedFare(20);
    setProximityRadius(800);
    setLat(16.5333);
    setLng(120.3333);
    setIcon('landmark');
    setNotes('LGU Ordinance Rate Schedule');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fare: LocationFare) => {
    setSelectedFare(fare);
    setLocationName(fare.location_name);
    setOriginTerminalId(fare.origin_terminal_id || terminals[0]?.id || '');
    setStandardFare(Number(fare.standard_fare));
    setDiscountedFare(Number(fare.discounted_fare || Math.round(Number(fare.standard_fare) * 0.8)));
    setProximityRadius(Number(fare.proximity_radius_meters || 800));
    setLat(Number(fare.lat));
    setLng(Number(fare.lng));
    setIcon(fare.icon || 'pin');
    setNotes(fare.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveLocationFare({
      id: selectedFare?.id,
      origin_terminal_id: originTerminalId,
      location_name: locationName,
      standard_fare: standardFare,
      discounted_fare: discountedFare,
      proximity_radius_meters: proximityRadius,
      lat,
      lng,
      icon,
      notes
    });
    setIsModalOpen(false);
  };

  const handleMapTestClick = (clickedLat: number, clickedLng: number) => {
    setTestPin({ lat: clickedLat, lng: clickedLng });
    const match = findMatchingLocationByProximity(clickedLat, clickedLng, locationFares);
    setTestResult(match);
  };

  return (
    <div className="page-container" id="location-fare-matrix-report">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <DollarSign size={28} /> Location-Based Tariff & Proximity Matrix
          </h2>
          <p className="page-subtitle">
            Configure municipal fixed tricycle fares per destination location & adjust proximity geofence radius.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> Add Location Tariff
          </button>

          <PDFExportButton
            elementId="location-fare-matrix-report"
            filename="PasadaGuide_LGU_Location_Fare_Schedule"
            title="LGU Municipal Location-Based Tricycle Fare Schedule"
            data={locationFares}
            headers={['Destination Location', 'Standard Fare (₱)', 'Discounted (₱)', 'Proximity Radius', 'Ordinance Notes']}
            keys={['location_name', 'standard_fare', 'discounted_fare', 'proximity_radius_meters', 'notes']}
          />
        </div>
      </div>

      {/* Grid: Matrix Table & Live Proximity Visualizer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1.05fr', gap: 24, alignItems: 'start' }}>
        {/* Location-Based Tariff Table */}
        <div className="table-container glass-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              📍 Regulated Location Rates ({locationFares.length} Zones)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Fixed Municipal Tariff
            </span>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Destination Location</th>
                <th>Standard Fare</th>
                <th>20% Discount</th>
                <th>Proximity Radius</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locationFares.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No location-based fare records found in database.
                  </td>
                </tr>
              ) : (
                locationFares.map((loc) => (
                  <tr key={loc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.35rem', width: 34, height: 34, borderRadius: 8, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {getLocationIconEmoji(loc.icon, loc.location_name)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-pasada-navy)' }}>
                            {loc.location_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {loc.notes || 'LGU Standard Tariff'} • {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>
                      ₱{Number(loc.standard_fare).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                      ₱{Number(loc.discounted_fare || Math.round(Number(loc.standard_fare) * 0.8)).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                        {loc.proximity_radius_meters}m
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleOpenEdit(loc)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Edit Rate & Radius"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete tariff for ${loc.location_name}?`)) {
                              onDeleteLocationFare(loc.id);
                            }
                          }}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Delete Location"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live Proximity Geofence Visualizer & Map Tester */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                <Target size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Proximity Zone Visualizer</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click anywhere on the map to test live proximity fare matching
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Leaflet Map */}
          <div style={{ height: '340px', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
            <MapContainer
              center={[16.5333, 120.3333]}
              zoom={14}
              zoomControl={false}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickTester onMapClick={handleMapTestClick} />

              {/* All Location Proximity Circles with Icon Pins */}
              {locationFares.map((loc) => {
                const isMatched = testResult?.matchedLocation?.id === loc.id;
                return (
                  <React.Fragment key={`admin-circle-${loc.id}`}>
                    <Circle
                      center={[loc.lat, loc.lng]}
                      radius={loc.proximity_radius_meters || 800}
                      pathOptions={{
                        color: isMatched ? '#00346F' : '#00C1FD',
                        fillColor: isMatched ? '#00346F' : '#00C1FD',
                        fillOpacity: isMatched ? 0.25 : 0.08,
                        weight: isMatched ? 3 : 1.5,
                      }}
                    />
                    <Marker 
                      key={`admin-loc-pin-${loc.id}-${loc.icon || 'pin'}-${loc.lat}-${loc.lng}`}
                      position={[loc.lat, loc.lng]} 
                      icon={createAdminLocPin(loc)}
                    >
                      <Popup>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                          {getLocationIconEmoji(loc.icon, loc.location_name)} {loc.location_name}<br />
                          <span style={{ color: '#16a34a' }}>₱{Number(loc.standard_fare).toFixed(2)}</span> • Radius: {loc.proximity_radius_meters}m
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}

              {/* Clicked Test Pin */}
              {testPin && (
                <Marker position={[testPin.lat, testPin.lng]} icon={testClickPinIcon}>
                  <Popup>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                      🎯 Test Click Pin<br />
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                        {testPin.lat.toFixed(4)}, {testPin.lng.toFixed(4)}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Test Decision Output Box */}
          {testResult && (
            <div style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: testResult.isExactProximityMatch ? 'rgba(22, 163, 74, 0.08)' : 'rgba(2, 132, 199, 0.08)',
              border: `1.5px solid ${testResult.isExactProximityMatch ? 'rgba(22, 163, 74, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: testResult.isExactProximityMatch ? '#15803d' : '#0369a1'
                }}>
                  {testResult.isExactProximityMatch ? '✅ Proximity Geofence Match' : 'ℹ️ Closest Location Assigned'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Distance: {testResult.distanceMeters}m
                </span>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-pasada-navy)', marginBottom: 2 }}>
                {getLocationIconEmoji(testResult.matchedLocation.icon, testResult.matchedLocation.location_name)} {testResult.matchedLocation.location_name}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Regulated Price:</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--success)' }}>
                    ₱{testResult.standardFare}.00
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Student/Senior (20% Off):</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    ₱{testResult.discountedFare}.00
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Location Fare Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {selectedFare ? 'Edit Location Tariff & Proximity' : 'Add New Location Tariff'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="modal-body">
                {/* Location Name */}
                <div className="form-group">
                  <label className="form-label">Destination Location Name</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Lomboy Grape Farms, Bagbag Beach, Central West"
                    className="input-field"
                  />
                </div>

                {/* Location Icon Selector */}
                <div className="form-group">
                  <label className="form-label">Location Icon / Category Pin</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {LOCATION_ICON_OPTIONS.map((opt) => {
                      const isSelected = icon === opt.id || icon === opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setIcon(opt.id)}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px 4px',
                            fontSize: '0.72rem',
                            border: isSelected ? '2px solid #00C1FD' : '1px solid var(--border-color)',
                            gap: 3,
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '1.3rem' }}>{opt.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontWeight: isSelected ? 800 : 600 }}>
                            {opt.label.split('/')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Standard Regulated Fare (₱)</label>
                    <input
                      type="number"
                      step="1.00"
                      required
                      value={standardFare}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setStandardFare(val);
                        setDiscountedFare(Math.round(val * 0.8));
                      }}
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">20% Discounted Rate (₱)</label>
                    <input
                      type="number"
                      step="1.00"
                      required
                      value={discountedFare}
                      onChange={(e) => setDiscountedFare(parseFloat(e.target.value) || 0)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label className="form-label">Proximity Geofence Radius</label>
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                      {proximityRadius} meters
                    </span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="2500"
                    step="50"
                    value={proximityRadius}
                    onChange={(e) => setProximityRadius(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Any booking drop-off within this circle automatically gets charged ₱{standardFare}.00
                  </div>
                </div>

                {/* Map Pin Coordinates Picker inside Modal */}
                <div className="form-group">
                  <label className="form-label">
                    Pin Location Coordinates ({lat.toFixed(5)}, {lng.toFixed(5)})
                  </label>
                  <div style={{ height: '220px', minHeight: '220px', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)', marginTop: 4, flexShrink: 0 }}>
                    <MapContainer
                      center={[lat, lng]}
                      zoom={14}
                      zoomControl={false}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <ModalLocationPicker
                        lat={lat}
                        lng={lng}
                        radiusMeters={proximityRadius}
                        icon={icon}
                        onLocationChange={(newLat, newLng) => {
                          setLat(newLat);
                          setLng(newLng);
                        }}
                      />
                    </MapContainer>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Click or drag the marker on the map to set the exact destination coordinates
                  </span>
                  {/* Manual Lat/Lng inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Latitude</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={lat}
                        onChange={(e) => setLat(parseFloat(e.target.value) || lat)}
                        className="input-field"
                        style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Longitude</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={lng}
                        onChange={(e) => setLng(parseFloat(e.target.value) || lng)}
                        className="input-field"
                        style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Origin TODA Hub</label>
                  <select
                    value={originTerminalId}
                    onChange={(e) => setOriginTerminalId(e.target.value)}
                    className="input-field"
                  >
                    {terminals.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Legal Ordinance Reference / Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Sangguniang Bayan Ordinance No. 2026-04 Tariff"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Save & Enforce Location Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
