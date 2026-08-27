import React, { useState, useEffect } from 'react';
import { 
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
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ShieldCheck,
  Search,
  MapPin
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LocationFare, Terminal, Driver } from '../types';
import { 
  findMatchingLocationByProximity, 
  calculateHaversineDistanceMeters,
  LOCATION_ICON_OPTIONS, 
  getLocationIconEmoji 
} from '../../services/fareService';
import { supabase } from '../../api/supabaseClient';

interface FareMatrixPageProps {
  locationFares: LocationFare[];
  terminals: Terminal[];
  drivers?: Driver[];
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

const liveVehiclePinIcon = L.divIcon({
  className: 'live-driver-pin',
  html: `<div style="background:#10b981;color:#ffffff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(16,185,129,0.6);cursor:pointer;">🛺</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
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

const LocationRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

export const FareMatrixPage: React.FC<FareMatrixPageProps> = ({ 
  locationFares, 
  terminals, 
  drivers = [],
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
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setVideoUploadError(null);

    try {
      // Upload to Supabase Storage — stores as a streamable public URL instead of base64
      const ext = file.name.split('.').pop() || 'mp4';
      const filePath = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('pasada-media')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('pasada-media')
        .getPublicUrl(filePath);

      setVideoUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error('Video upload failed:', err);
      setVideoUploadError(err.message || 'Upload failed. Try again.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName || locationName.trim() === '') {
      setCurrentStep(1);
      alert('Please provide a destination location name in Step 1.');
      return;
    }
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

  const [selectedLocation, setSelectedLocation] = useState<LocationFare | null>(null);
  const [searchRule, setSearchRule] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (!selectedLocation && locationFares.length > 0) {
      setSelectedLocation(locationFares[0]);
    }
  }, [locationFares, selectedLocation]);

  const handleMapTestClick = (clickedLat: number, clickedLng: number) => {
    setTestPin({ lat: clickedLat, lng: clickedLng });
    const match = findMatchingLocationByProximity(clickedLat, clickedLng, locationFares);
    setTestResult(match);
    if (match?.matchedLocation) {
      setSelectedLocation(match.matchedLocation);
    }
  };

  const filteredLocationFares = locationFares.filter(loc => {
    const term = searchRule.toLowerCase();
    return loc.location_name.toLowerCase().includes(term) || (loc.notes && loc.notes.toLowerCase().includes(term));
  });

  const activeLocation = selectedLocation || testResult?.matchedLocation || locationFares[0] || null;

  // Strictly calculate active approved vehicles whose live GPS coordinates fall within the selected location radius
  const liveVehiclesAtLocation = React.useMemo(() => {
    if (!activeLocation) return [];
    const radiusMeters = activeLocation.proximity_radius_meters || 1000;

    return (drivers || []).filter(d => {
      // Only approved active drivers
      if (d.verification_status && d.verification_status !== 'approved') {
        return false;
      }

      // Check live GPS coordinates against location center and radius
      if (d.current_lat !== undefined && d.current_lat !== null && d.current_lng !== undefined && d.current_lng !== null) {
        const dist = calculateHaversineDistanceMeters(
          Number(d.current_lat),
          Number(d.current_lng),
          Number(activeLocation.lat),
          Number(activeLocation.lng)
        );
        return dist <= radiusMeters;
      }

      // If driver has no live GPS reported, check if strictly assigned to this location's terminal
      if (d.terminal_id && activeLocation.origin_terminal_id && d.terminal_id === activeLocation.origin_terminal_id) {
        return true;
      }

      return false;
    });
  }, [activeLocation, drivers]);

  // Strict live vehicle count — exactly 0 if none are at this location
  const activeVehicleCount = liveVehiclesAtLocation.length;

  const estWaitTime = React.useMemo(() => {
    if (activeVehicleCount >= 10) return '2m';
    if (activeVehicleCount >= 5) return '3m';
    if (activeVehicleCount >= 2) return '5m';
    if (activeVehicleCount === 1) return '4m';
    return 'None';
  }, [activeVehicleCount]);

  return (
    <div className="page-container p-6 sm:p-8 space-y-8" id="location-fare-matrix-report">
      {/* Stitch Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Fare Matrix &amp; Proximity Rates
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage regulated location rates and dynamic geofence pricing.
        </p>
      </div>

      {/* Bento Grid Layout (Span 8 + Span 4) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Main Table Area (Span 8) */}
        <div className="col-span-12 xl:col-span-8 bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/80 dark:border-slate-800 soft-shadow hover:shadow-lg transition-shadow duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white shrink-0">
              Regulated Location Rates
            </h3>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search location or landmark..."
                  value={searchRule}
                  onChange={(e) => setSearchRule(e.target.value)}
                  className="w-56 sm:w-64 h-9 pl-9 pr-3.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#276efe] focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={handleOpenAdd}
                className="h-9 px-4 bg-[#276efe] text-white rounded-full text-xs font-medium hover:opacity-90 transition-opacity shadow-sm shadow-[#276efe]/20 cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Add Location</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-800">
                  <th className="pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">DESTINATION / LOCATION</th>
                  <th className="pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">STANDARD FARE</th>
                  <th className="pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">DISCOUNT FARE</th>
                  <th className="pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PROXIMITY RADIUS</th>
                  <th className="pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredLocationFares.map((loc) => {
                  const isSelected = activeLocation?.id === loc.id;
                  const radiusKm = (loc.proximity_radius_meters / 1000).toFixed(1);
                  const isSurge = loc.location_name.includes('Stadium') || loc.notes?.includes('Surge');
                  const isActive = loc.is_active !== false;

                  return (
                    <tr 
                      key={loc.id} 
                      onClick={() => {
                        setSelectedLocation(loc);
                        setTestResult(null);
                        setTestPin({ lat: loc.lat, lng: loc.lng });
                      }}
                      className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-[#276efe]/5 dark:bg-[#276efe]/10' : ''
                      }`}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            loc.icon === 'stadium' 
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300' 
                              : loc.icon === 'business'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-[#276efe]/10 text-[#276efe]'
                          }`}>
                            {getLocationIconEmoji(loc.icon, loc.location_name)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white text-xs">{loc.location_name}</p>
                            <p className="text-[12px] text-slate-400">{loc.notes || 'Regulated Destination'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 font-medium text-slate-900 dark:text-white text-xs">
                        ₱{Number(loc.standard_fare).toFixed(2)}
                        {isSurge && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 rounded ml-1 font-semibold">
                            Surge
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-slate-500 dark:text-slate-400 text-xs">
                        <span>₱{Number(loc.discounted_fare || Math.round(Number(loc.standard_fare) * 0.8)).toFixed(2)}</span>
                        <span className="text-[10px] bg-[#dae2fd] text-[#5c647a] dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded ml-1 font-semibold">
                          Sen/Stu
                        </span>
                      </td>

                      <td className="py-4 text-slate-700 dark:text-slate-300 font-normal text-xs">
                        {radiusKm} km
                      </td>

                      <td className="py-4 text-right">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#e6f7ef] text-[#006947] dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#eceef0] text-[#565e74] dark:bg-slate-800 dark:text-slate-400">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar Area (Span 4) */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {/* Card 1: Location Map Visualizer */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-200/80 dark:border-slate-800 soft-shadow">
            <div className="flex justify-between items-center mb-3 px-2">
              <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">
                Location Map Visualizer
              </h3>
              <button className="text-[#276efe] hover:bg-[#276efe]/5 p-1.5 rounded-full transition-colors cursor-pointer">
                <Layers size={20} />
              </button>
            </div>

            <div className="w-full h-[240px] rounded-[16px] overflow-hidden relative bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
              <MapContainer
                center={[activeLocation?.lat || 16.5333, activeLocation?.lng || 120.3333]}
                zoom={12}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickTester onMapClick={handleMapTestClick} />
                <LocationRecenter center={[activeLocation?.lat || 16.5333, activeLocation?.lng || 120.3333]} />

                {filteredLocationFares.map((loc) => {
                  const isHighlighted = activeLocation?.id === loc.id;
                  return (
                    <React.Fragment key={`admin-circle-${loc.id}`}>
                      <Circle
                        center={[loc.lat, loc.lng]}
                        radius={loc.proximity_radius_meters || 1500}
                        pathOptions={{
                          color: isHighlighted ? '#276efe' : '#206afa',
                          fillColor: isHighlighted ? '#276efe' : '#206afa',
                          fillOpacity: isHighlighted ? 0.35 : 0.12,
                          weight: isHighlighted ? 2.5 : 1,
                        }}
                      />
                      <Marker 
                        position={[loc.lat, loc.lng]} 
                        icon={createAdminLocPin(loc)}
                        eventHandlers={{
                          click: () => {
                            setSelectedLocation(loc);
                            setTestResult(null);
                            setTestPin({ lat: loc.lat, lng: loc.lng });
                          }
                        }}
                      >
                        <Popup>
                          <div className="text-xs font-bold">
                            {loc.location_name}<br />
                            <span className="text-[#276efe]">₱{Number(loc.standard_fare).toFixed(2)}</span>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

                {/* Live Active Vehicles At Selected Location */}
                {liveVehiclesAtLocation.map((d) => (
                  <Marker 
                    key={`driver-live-marker-${d.id || d.profile_id}`} 
                    position={[d.current_lat!, d.current_lng!]} 
                    icon={liveVehiclePinIcon}
                  >
                    <Popup>
                      <div className="text-xs font-bold">
                        🛺 {d.profile?.full_name || 'Active Tricycle'}<br />
                        <span className="text-slate-500 font-normal">Plate: {d.plate_number}</span><br />
                        <span className="text-emerald-600 font-semibold">● At {activeLocation?.location_name}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Map Overlay Controls */}
              <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-[500]">
                <button 
                  onClick={() => {}}
                  className="w-8 h-8 bg-white dark:bg-slate-800 rounded-md shadow flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
                >
                  +
                </button>
                <button 
                  onClick={() => {}}
                  className="w-8 h-8 bg-white dark:bg-slate-800 rounded-md shadow flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
                >
                  -
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Location Details */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/80 dark:border-slate-800 soft-shadow">
            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-4">
              Location Details
            </h3>

            <div className="bg-[#f2f4f6] dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700 mb-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-[#276efe] bg-[#276efe]/10 px-2 py-1 rounded">
                  Selected Location: {activeLocation?.location_name || 'Bauang Landmark'}
                </span>
                <span className="text-xs text-slate-400 flex items-center font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Live Data
                </span>
              </div>

              <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                {activeLocation?.location_name || 'Bauang Central'}
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Radius: {((activeLocation?.proximity_radius_meters || 1000) / 1000).toFixed(1)}km • Center: {activeLocation?.lat ? activeLocation.lat.toFixed(4) : '16.5333'}° N, {activeLocation?.lng ? Math.abs(activeLocation.lng).toFixed(4) : '120.3333'}° {activeLocation?.lng && activeLocation.lng >= 0 ? 'E' : 'W'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-400 mb-1">Current Active Vehicles</span>
                  <span className="block text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{activeVehicleCount}</span>
                    {activeVehicleCount > 0 ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200/50">
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        None
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 mb-1">Est. Wait Time</span>
                  <span className="block text-xl font-semibold text-slate-900 dark:text-white">
                    {estWaitTime}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => activeLocation && handleOpenEdit(activeLocation)}
              className="w-full py-2.5 bg-[#276efe]/5 text-[#276efe] border border-[#276efe]/20 rounded-full text-xs font-medium hover:bg-[#276efe]/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck size={16} />
              <span>Edit Location Rate</span>
            </button>
          </div>
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
                onClick={() => setCurrentStep(2)}
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

                {/* STEP 2: Add Files (Pictures, Video & Audio) */}
                {currentStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* ── Unified Media Upload Zone ── */}
                    <div style={{
                      border: '2px dashed #0052d1',
                      borderRadius: 14,
                      background: 'rgba(0,82,209,0.03)',
                      padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.83rem', fontWeight: 800, color: '#0052d1', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UploadCloud size={15} /> Media Files
                        </span>
                        <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>Photos, videos — all in one</span>
                      </div>

                      {/* Two upload buttons side by side */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <label style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                          background: '#0052d1', color: '#fff',
                          fontSize: '0.78rem', fontWeight: 800, transition: 'opacity 0.15s',
                        }}>
                          <ImageIcon size={14} /> Add Photos
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>

                        <label style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 0', borderRadius: 10, cursor: isUploadingVideo ? 'not-allowed' : 'pointer',
                          background: isUploadingVideo ? '#6b9cf5' : '#131b2e', color: '#fff',
                          fontSize: '0.78rem', fontWeight: 800, transition: 'opacity 0.15s',
                          opacity: isUploadingVideo ? 0.8 : 1,
                        }}>
                          {isUploadingVideo ? (
                            <>
                              <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                              Uploading…
                            </>
                          ) : (
                            <><Video size={14} /> Add Video</>
                          )}
                          <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideo} style={{ display: 'none' }} />
                        </label>
                      </div>

                      {videoUploadError && (
                        <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>⚠️ {videoUploadError}</div>
                      )}

                      {/* ── Unified Preview Strip ── */}
                      {(images.length > 0 || videoUrl) && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                          {/* Image thumbnails */}
                          {images.map((imgUrl, idx) => {
                            const isCover = coverImageUrl === imgUrl || (!coverImageUrl && idx === 0);
                            return (
                              <div
                                key={`img-${idx}`}
                                onClick={() => setCoverImageUrl(imgUrl)}
                                title="Click to set as cover"
                                style={{
                                  position: 'relative', flexShrink: 0,
                                  width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
                                  border: isCover ? '2.5px solid #0052d1' : '2px solid transparent',
                                  boxShadow: isCover ? '0 0 0 1px #0052d1' : '0 1px 4px rgba(0,0,0,0.15)',
                                  cursor: 'pointer',
                                }}
                              >
                                <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {isCover && (
                                  <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(0,82,209,0.9)', color: '#fff',
                                    fontSize: '0.5rem', fontWeight: 900, textAlign: 'center', padding: '2px 0', letterSpacing: 1
                                  }}>COVER</div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                  style={{
                                    position: 'absolute', top: 3, right: 3, width: 17, height: 17,
                                    borderRadius: '50%', background: 'rgba(220,38,38,0.9)', color: '#fff',
                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.6rem', fontWeight: 900, lineHeight: 1,
                                  }}
                                  title="Remove"
                                >×</button>
                              </div>
                            );
                          })}

                          {/* Video preview tile */}
                          {videoUrl && !isUploadingVideo && (
                            <div style={{
                              position: 'relative', flexShrink: 0,
                              width: 120, height: 72, borderRadius: 10, overflow: 'hidden',
                              border: '2px solid #fcd400', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            }}>
                              <video
                                src={videoUrl}
                                muted playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Play size={20} color="#fff" fill="#fff" />
                              </div>
                              <div style={{
                                position: 'absolute', bottom: 3, left: 0, right: 0, textAlign: 'center',
                                fontSize: '0.5rem', fontWeight: 900, color: '#fcd400', letterSpacing: 1,
                              }}>VIDEO</div>
                              <button
                                type="button"
                                onClick={() => setVideoUrl('')}
                                style={{
                                  position: 'absolute', top: 3, right: 3, width: 17, height: 17,
                                  borderRadius: '50%', background: 'rgba(220,38,38,0.9)', color: '#fff',
                                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.6rem', fontWeight: 900,
                                }}
                                title="Remove video"
                              >×</button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Empty state */}
                      {images.length === 0 && !videoUrl && !isUploadingVideo && (
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
                          No media yet — upload photos or a video above
                        </p>
                      )}
                    </div>

                    {/* ── Explore Description ── */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: 4 }}>
                        Description & Highlights
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Key highlights, attractions, visiting hours, and stories shown on the Explore feed…"
                        rows={3}
                        className="input-field"
                        style={{ resize: 'none', fontSize: '0.82rem' }}
                      />
                    </div>

                    {/* ── Audio Tour Guide ── */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Music size={14} style={{ color: '#0052d1' }} /> Audio Tour Guide
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{
                          padding: '7px 12px', borderRadius: 8,
                          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        }}>
                          <UploadCloud size={13} /> Upload Audio
                          <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} />
                        </label>
                        <input
                          type="text"
                          value={audioUrl}
                          onChange={(e) => setAudioUrl(e.target.value)}
                          placeholder="Or paste audio URL…"
                          className="input-field"
                          style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                        />
                        {audioUrl && (
                          <button type="button" onClick={() => setAudioUrl('')} className="btn btn-secondary"
                            style={{ padding: '6px 10px', color: 'var(--danger)' }} title="Clear Audio">
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

                    {/* ── Video URL override (manual paste) ── */}
                    {!videoUrl && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Video size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          type="text"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="Or paste a video MP4 URL directly…"
                          className="input-field"
                          style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                        />
                      </div>
                    )}

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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentStep(2);
                      }}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <span>Next: Add Files (Pictures / Video / Audio)</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
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
