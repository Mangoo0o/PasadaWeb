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
  Layers,
  Image as ImageIcon,
  Music,
  Video,
  UploadCloud,
  X,
  Play,
  Star,
  ArrowRight,
  ArrowLeft,
  MapPin
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
    html: `<div style="background:#0052d1;color:#ffffff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid #ffffff;box-shadow:0 3px 12px rgba(0,82,209,0.4);cursor:pointer;">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const testClickPinIcon = L.divIcon({
  className: 'test-click-pin',
  html: `<div style="background:#fcd400;color:#131b2e;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2.5px solid #131b2e;box-shadow:0 0 12px rgba(252,212,0,0.8);animation:pulse 1.5s infinite;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
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
  icon,
  onLocationChange
}: {
  lat: number;
  lng: number;
  radiusMeters: number;
  icon: string;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const emoji = getLocationIconEmoji(icon);

  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);

  const markerIcon = L.divIcon({
    className: 'picker-marker-pin',
    html: `<div style="background:#0052d1;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,82,209,0.5);cursor:move;">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  return (
    <>
      <MapInvalidateSize />
      <Circle
        center={[lat, lng]}
        radius={radiusMeters}
        pathOptions={{
          color: '#0052d1',
          fillColor: '#206afa',
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form State
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [originTerminalId, setOriginTerminalId] = useState(terminals[0]?.id || 'term-bauang-central');
  const [standardFare, setStandardFare] = useState<number>(20);
  const [discountedFare, setDiscountedFare] = useState<number>(16);
  const [proximityRadius, setProximityRadius] = useState<number>(800);
  const [lat, setLat] = useState<number>(16.5333);
  const [lng, setLng] = useState<number>(120.3333);
  const [icon, setIcon] = useState<string>('pin');
  const [notes, setNotes] = useState<string>('');

  // Media State
  const [images, setImages] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

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
    setCurrentStep(1);
    setLocationName('');
    setDescription('');
    setImages([]);
    setCoverImageUrl('');
    setAudioUrl('');
    setVideoUrl('');
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
    setCurrentStep(1);
    setLocationName(fare.location_name);
    setDescription(fare.description || '');
    const loadedImages = fare.images && fare.images.length > 0 
      ? fare.images 
      : (fare.cover_image_url ? [fare.cover_image_url] : []);
    setImages(loadedImages);
    setCoverImageUrl(fare.cover_image_url || loadedImages[0] || '');
    setAudioUrl(fare.audio_url || '');
    setVideoUrl(fare.video_url || '');
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImages((prev) => {
          const next = [...prev, result];
          if (!coverImageUrl) setCoverImageUrl(result);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (coverImageUrl === prev[indexToRemove]) {
        setCoverImageUrl(next[0] || '');
      }
      return next;
    });
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAudioUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setVideoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveLocationFare({
      id: selectedFare?.id,
      origin_terminal_id: originTerminalId,
      location_name: locationName,
      description,
      cover_image_url: coverImageUrl || images[0] || '',
      images,
      audio_url: audioUrl,
      video_url: videoUrl,
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
        <div className="table-container glass-card" style={{ maxHeight: 'calc(100vh - 230px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg-surface)' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              📍 Regulated Location Rates ({locationFares.length} Zones)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Fixed Municipal Tariff
            </span>
          </div>

          <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
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

      {/* Add / Edit Location Fare Modal with Wide 2-Step Stepper (Scroll-Free) */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              width: '96%',
              maxWidth: 1100,
              maxHeight: '94vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
            }}
          >
            {/* Header — fixed */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              borderBottom: '1px solid var(--border-color)',
              flexShrink: 0,
              background: 'var(--bg-surface)',
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} style={{ color: '#fcd400' }} />
                  {selectedFare ? 'Edit Location Tariff & Explore Media' : 'Add New Location Tariff'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Configure municipal fares, proximity geofence, and media showcases for the Explore feed.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '1.4rem', 
                  lineHeight: 1, 
                  color: 'var(--text-muted)' 
                }}
              >
                ×
              </button>
            </div>

            {/* Stepper Tabs Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: currentStep === 1 ? '#0052d1' : 'transparent',
                  color: currentStep === 1 ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: currentStep === 1 ? 'none' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: currentStep === 1 ? '#ffffff' : 'var(--border-color)',
                  color: currentStep === 1 ? '#0052d1' : 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  1
                </span>
                <span>Step 1: Set Location & Fare Rates</span>
              </button>

              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>→</span>

              <button
                type="button"
                onClick={() => {
                  if (!locationName) {
                    alert('Please enter a location name first.');
                    return;
                  }
                  setCurrentStep(2);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: currentStep === 2 ? '#0052d1' : 'transparent',
                  color: currentStep === 2 ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: currentStep === 2 ? 'none' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: currentStep === 2 ? '#ffffff' : 'var(--border-color)',
                  color: currentStep === 2 ? '#0052d1' : 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  2
                </span>
                <span>Step 2: Add Files (Pictures, Video & Audio)</span>
                {images.length > 0 && (
                  <span style={{
                    background: currentStep === 2 ? '#fcd400' : '#0052d1',
                    color: currentStep === 2 ? '#131b2e' : '#fff',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: '0.65rem',
                    fontWeight: 900
                  }}>
                    {images.length}
                  </span>
                )}
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSave}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ flex: 1, minHeight: 0, padding: '18px 24px', overflowY: 'auto' }}>
                
                {/* STEP 1: Location & Fare Rate (2 Columns, fits without scroll) */}
                {currentStep === 1 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 24,
                    alignItems: 'start',
                  }}>
                    {/* Step 1 Left Column: Names, Icons, Fares & Coordinates */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Destination Name */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                          Destination Location Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          placeholder="e.g. Lomboy Grape Farms, Bauang Beach, Central West"
                          className="input-field"
                          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                      </div>

                      {/* Location Icon Category Pins */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                          Category Pin Icon
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
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
                                  padding: '6px 2px',
                                  fontSize: '0.65rem',
                                  border: isSelected ? '2px solid #0052d1' : '1px solid var(--border-color)',
                                  gap: 2,
                                  cursor: 'pointer',
                                }}
                              >
                                <span style={{ fontSize: '1.15rem' }}>{opt.icon}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontWeight: isSelected ? 800 : 600 }}>
                                  {opt.label.split('/')[0]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fares */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem' }}>Standard Fare (₱)</label>
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
                            style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem' }}>20% Discounted (₱)</label>
                          <input
                            type="number"
                            step="1.00"
                            required
                            value={discountedFare}
                            onChange={(e) => setDiscountedFare(parseFloat(e.target.value) || 0)}
                            className="input-field"
                            style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      {/* Manual Lat/Lng Coordinates (Moved to Left Column) */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={15} style={{ color: '#0052d1' }} />
                          Precise GPS Coordinates
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Latitude</label>
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
                            <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Longitude</label>
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
                    </div>

                    {/* Step 1 Right Column: Geofence & Enriched Leaflet Map */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Radius Slider */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.82rem' }}>
                            Proximity Geofence Radius
                          </label>
                          <span style={{ fontWeight: 900, color: '#0052d1', fontSize: '0.85rem', background: 'rgba(0,82,209,0.1)', padding: '2px 8px', borderRadius: 6 }}>
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
                          style={{ width: '100%', accentColor: '#0052d1', marginTop: 4 }}
                        />
                      </div>

                      {/* Enriched Bigger Map Picker */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.82rem' }}>
                            Interactive Map Picker
                          </label>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click map or drag marker pin</span>
                        </div>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: 310,
                          borderRadius: 14,
                          overflow: 'hidden',
                          border: '1.5px solid var(--border-color)',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                        }}>
                          <MapContainer
                            center={[lat, lng]}
                            zoom={14}
                            zoomControl={false}
                            scrollWheelZoom={false}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
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
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Add Files (Pictures, Video & Audio) (2 Columns, fits without scroll) */}
                {currentStep === 2 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 24,
                    alignItems: 'start',
                  }}>
                    {/* Step 2 Left Column: Multiple Picture Upload & Highlights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Multi-Photo / Picture Upload Section */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <label className="form-label" style={{ fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
                            <ImageIcon size={16} style={{ color: '#0052d1' }} />
                            Explore Pictures ({images.length} uploaded)
                          </label>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Multiple photos supported</span>
                        </div>

                        {/* Upload Button */}
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px 14px',
                          border: '2px dashed #0052d1',
                          borderRadius: 12,
                          cursor: 'pointer',
                          background: 'rgba(0,82,209,0.04)',
                          transition: 'all 0.2s',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#0052d1',
                        }}>
                          <UploadCloud size={18} />
                          <span>Click to Upload Pictures (JPG, PNG, WebP)</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </label>

                        {/* Thumbnail Preview Grid */}
                        {images.length > 0 && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                            gap: 8,
                            marginTop: 10,
                            maxHeight: 120,
                            overflowY: 'auto',
                            padding: 2,
                          }}>
                            {images.map((imgUrl, idx) => {
                              const isCover = coverImageUrl === imgUrl || (!coverImageUrl && idx === 0);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setCoverImageUrl(imgUrl)}
                                  style={{
                                    position: 'relative',
                                    height: 56,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    border: isCover ? '2.5px solid #0052d1' : '1px solid var(--border-color)',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                  }}
                                  title="Click to set as primary cover photo"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Upload ${idx + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  {isCover && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      background: 'rgba(0,82,209,0.92)',
                                      color: '#fff',
                                      fontSize: '0.55rem',
                                      fontWeight: 900,
                                      textAlign: 'center',
                                      padding: '1px 0',
                                      textTransform: 'uppercase',
                                    }}>
                                      Cover
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveImage(idx);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 2,
                                      right: 2,
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      background: 'rgba(220,38,38,0.95)',
                                      color: '#fff',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65rem',
                                      fontWeight: 900,
                                    }}
                                    title="Remove image"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Explore Description */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                          Explore Description & Highlights
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Key highlights, attractions, visiting hours, and stories shown to commuters on the Explore feed..."
                          rows={3}
                          className="input-field"
                          style={{ resize: 'none', fontSize: '0.82rem' }}
                        />
                      </div>
                    </div>

                    {/* Step 2 Right Column: Audio & Video Uploads */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Audio Tour Guide Upload */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
                          <Music size={16} style={{ color: '#0052d1' }} />
                          Audio Tour Guide Narration
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{
                            padding: '7px 12px',
                            borderRadius: 8,
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                          }}>
                            <UploadCloud size={14} />
                            Upload Audio
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleAudioUpload}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <input
                            type="text"
                            value={audioUrl}
                            onChange={(e) => setAudioUrl(e.target.value)}
                            placeholder="Or paste audio URL..."
                            className="input-field"
                            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                          />
                          {audioUrl && (
                            <button
                              type="button"
                              onClick={() => setAudioUrl('')}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', color: 'var(--danger)' }}
                              title="Clear Audio"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {audioUrl && (
                          <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                            <audio controls src={audioUrl} style={{ width: '100%', height: 30 }} />
                          </div>
                        )}
                      </div>

                      {/* Video Guide / Reel Upload */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
                          <Video size={16} style={{ color: '#0052d1' }} />
                          Video Showcase / Reel (MP4/WebM)
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{
                            padding: '7px 12px',
                            borderRadius: 8,
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                          }}>
                            <UploadCloud size={14} />
                            Upload Video
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handleVideoUpload}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Or paste video MP4 URL..."
                            className="input-field"
                            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                          />
                          {videoUrl && (
                            <button
                              type="button"
                              onClick={() => setVideoUrl('')}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', color: 'var(--danger)' }}
                              title="Clear Video"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {videoUrl && (
                          <div style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', height: 110, background: '#000' }}>
                            <video controls src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Stepper Footer Controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                flexShrink: 0,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}>
                <div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {currentStep === 2 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <ArrowLeft size={16} /> Back: Set Location
                    </button>
                  )}

                  {currentStep === 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!locationName) {
                          alert('Please enter a destination location name.');
                          return;
                        }
                        setCurrentStep(2);
                      }}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span>Next: Add Files (Pictures / Video / Audio)</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Check size={16} /> Save & Enforce Location Rate
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
