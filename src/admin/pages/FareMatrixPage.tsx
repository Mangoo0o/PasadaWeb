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
  UploadCloud,
  X,
  Star,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ShieldCheck,
  Search,
  MapPin,
  Image as ImageIcon,
  Video,
  Play,
  Music
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
import { cn } from '../../lib/utils';

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

function MapZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-[500]">
      <button 
        type="button"
        onClick={() => map.zoomIn()}
        className="w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-sm cursor-pointer active:scale-95"
        title="Zoom In"
        aria-label="Zoom In"
      >
        +
      </button>
      <button 
        type="button"
        onClick={() => map.zoomOut()}
        className="w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-sm cursor-pointer active:scale-95"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        -
      </button>
    </div>
  );
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
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
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
    setFormError(null);
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
      setFormError('Please provide a destination location name in Step 1.');
      return;
    }
    setFormError(null);
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <SlidersHorizontal size={24} />
            </span>
            <span>Fare Matrix &amp; Proximity Rates</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage regulated location rates, dynamic geofence pricing, &amp; distance-based tariffs.
          </p>
        </div>
      </div>

      {/* Bento Grid Layout (Span 8 + Span 4) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Main Table Area (Span 8) */}
        <div className="col-span-12 xl:col-span-8 bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200/80 dark:border-slate-800 soft-shadow hover:shadow-lg transition-shadow duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight shrink-0">
              Regulated Location Rates
            </h3>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search location or landmark..."
                  value={searchRule}
                  onChange={(e) => setSearchRule(e.target.value)}
                  className="w-56 sm:w-64 h-9 pl-9 pr-3.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#276efe] focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={handleOpenAdd}
                className="h-9 px-4 bg-[#0052d1] hover:bg-[#206afa] text-white rounded-md text-xs font-bold transition-all shadow-sm shadow-[#0052d1]/20 cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
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
                  <th className="pb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DESTINATION / LOCATION</th>
                  <th className="pb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">STANDARD FARE</th>
                  <th className="pb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DISCOUNT FARE</th>
                  <th className="pb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PROXIMITY RADIUS</th>
                  <th className="pb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">STATUS</th>
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
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm ${
                            loc.icon === 'stadium' 
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300' 
                              : loc.icon === 'business'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-[#276efe]/10 text-[#276efe]'
                          }`}>
                            {getLocationIconEmoji(loc.icon, loc.location_name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{loc.location_name}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">{loc.notes || 'Regulated Destination'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 font-bold text-slate-900 dark:text-white text-xs tabular-nums">
                        ₱{Number(loc.standard_fare).toFixed(2)}
                        {isSurge && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 rounded ml-1 font-semibold">
                            Surge
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-slate-500 dark:text-slate-400 text-xs">
                        <span className="tabular-nums font-semibold">₱{Number(loc.discounted_fare || Math.round(Number(loc.standard_fare) * 0.8)).toFixed(2)}</span>
                        <span className="text-[10px] bg-[#dae2fd] text-[#5c647a] dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded ml-1 font-semibold">
                          Sen/Stu
                        </span>
                      </td>

                      <td className="py-4 text-slate-700 dark:text-slate-300 font-mono text-xs tabular-nums">
                        {radiusKm} km
                      </td>

                      <td className="py-4 text-right">
                        {isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#e6f7ef] text-[#006947] dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#eceef0] text-[#565e74] dark:bg-slate-800 dark:text-slate-400">
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
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200/80 dark:border-slate-800 soft-shadow">
            <div className="flex justify-between items-center mb-3 px-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Location Map Visualizer
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setSelectedLocation(null);
                  setTestResult(null);
                }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-[#0052d1] dark:text-sky-400 hover:bg-[#0052d1]/10 transition-colors cursor-pointer active:scale-95"
                title="Reset Location Filter"
              >
                <Crosshair size={16} />
              </button>
            </div>

            <div className="w-full h-[240px] rounded-md overflow-hidden relative bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
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
                <MapZoomControls />

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
            </div>
          </div>

          {/* Card 2: Location Details */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200/80 dark:border-slate-800 soft-shadow">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">
              Location Details
            </h3>

            <div className="bg-[#f2f4f6] dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200/80 dark:border-slate-700 mb-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-[#276efe] bg-[#276efe]/10 px-2 py-0.5 rounded">
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono tabular-nums">
                Radius: {((activeLocation?.proximity_radius_meters || 1000) / 1000).toFixed(1)}km • Center: {activeLocation?.lat ? activeLocation.lat.toFixed(4) : '16.5333'}° N, {activeLocation?.lng ? Math.abs(activeLocation.lng).toFixed(4) : '120.3333'}° {activeLocation?.lng && activeLocation.lng >= 0 ? 'E' : 'W'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Current Active Vehicles</span>
                  <span className="block text-2xl font-black text-slate-900 dark:text-white tabular-nums flex items-center gap-1.5">
                    <span>{activeVehicleCount}</span>
                    {activeVehicleCount > 0 ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/50 tabular-nums">
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        None
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Est. Wait Time</span>
                  <span className="block text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {estWaitTime}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => activeLocation && handleOpenEdit(activeLocation)}
              className="w-full h-9 px-4 bg-[#276efe]/5 text-[#276efe] border border-[#276efe]/20 rounded-md text-xs font-semibold hover:bg-[#276efe]/10 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ShieldCheck size={16} />
              <span>Edit Location Rate</span>
            </button>
          </div>
        </div>
      </div>
             {/* Add / Edit Location Fare Modal with Executive 2-Step Layout */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content max-w-6xl w-[96%] max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header px-6 sm:px-8 py-5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={22} className="text-[#0052d1] dark:text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedFare ? 'Edit Location Tariff & Multimedia Guide' : 'Register Location Tariff Point'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Configure municipal fares, proximity geofence radius, and multimedia highlights for commuter navigation.
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="modal-close-btn"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Tabs Ribbon */}
            <div className="px-6 sm:px-8 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2.5",
                    currentStep === 1
                      ? "bg-[#0052d1] text-white shadow-md shadow-[#0052d1]/25"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black",
                    currentStep === 1 ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}>
                    1
                  </span>
                  <span>Step 1: Location &amp; Fare Rates</span>
                </button>

                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2.5",
                    currentStep === 2
                      ? "bg-[#0052d1] text-white shadow-md shadow-[#0052d1]/25"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black",
                    currentStep === 2 ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}>
                    2
                  </span>
                  <span>Step 2: Media &amp; Highlights</span>
                  {images.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#fcd400] text-slate-900">
                      {images.length} photos
                    </span>
                  )}
                  {videoUrl && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500 text-white">
                      Video
                    </span>
                  )}
                </button>
              </div>

              <span className="hidden md:inline-block text-xs text-slate-400 font-medium">
                {currentStep === 1 ? 'Phase 1 of 2: Spatial & Pricing Parameters' : 'Phase 2 of 2: Multimedia Showcases'}
              </span>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSave}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <div className="flex-1 min-h-0 p-6 sm:p-8 overflow-y-auto space-y-6">
                {formError && (
                  <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center justify-between animate-in fade-in">
                    <span className="flex items-center gap-2">⚠️ {formError}</span>
                    <button type="button" onClick={() => setFormError(null)} className="text-rose-500 hover:text-rose-700 text-lg font-bold cursor-pointer">×</button>
                  </div>
                )}
                
                {/* STEP 1: Location & Fare Rate */}
                {currentStep === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                    {/* Left Column: Details & Pricing (Reduced to 4 cols on XL for maximum map area) */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-3.5">
                      {/* Destination Name */}
                      <div>
                        <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                          Destination Location Name *
                        </label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0052d1] dark:text-sky-400" />
                          <input
                            type="text"
                            required
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="e.g. Lomboy Grape Farms, Bauang Market"
                            className="w-full h-10 pl-9 pr-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/15 transition-all"
                          />
                        </div>
                      </div>

                      {/* Location Icon Category Pins (Compact 3-column Grid) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Category Pin Icon *
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Map icon style
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {LOCATION_ICON_OPTIONS.map((opt) => {
                            const isSelected = icon === opt.id || icon === opt.icon;
                            const parts = opt.label.split(' / ');
                            const primaryName = parts[0];
                            const secondaryName = parts[1] || opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setIcon(opt.id)}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer",
                                  isSelected
                                    ? "bg-[#0052d1]/10 dark:bg-sky-950/60 border-[#0052d1] ring-2 ring-[#0052d1]/20 shadow-xs"
                                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                              >
                                <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center text-base shrink-0 shadow-xs border border-slate-200/60 dark:border-slate-700">
                                  {opt.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                    {primaryName}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                                    {secondaryName}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fares */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                              Standard Base *
                            </label>
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded">
                              Regular
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-emerald-600 dark:text-emerald-400">
                              ₱
                            </span>
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
                              className="w-full h-10 pl-8 pr-3 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 rounded-lg text-base font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                          </div>
                          <p className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                            Tricycle base tariff
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-blue-900 dark:text-blue-200">
                              20% Discounted *
                            </label>
                            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
                              Student/PWD
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-blue-600 dark:text-blue-400">
                              ₱
                            </span>
                            <input
                              type="number"
                              step="1.00"
                              required
                              value={discountedFare}
                              onChange={(e) => setDiscountedFare(parseFloat(e.target.value) || 0)}
                              className="w-full h-10 pl-8 pr-3 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700/80 rounded-lg text-base font-black text-blue-700 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                          <p className="text-[9px] text-blue-700/80 dark:text-blue-400/80 font-medium">
                            Mandatory 20% discount
                          </p>
                        </div>
                      </div>

                      {/* Proximity Geofence Radius Slider Card (Moved to Left Column) */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                              Proximity Geofence Radius
                            </label>
                            <span className="text-[10px] text-slate-400">
                              Commuter tariff trigger boundary
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#0052d1] dark:text-sky-400 bg-[#0052d1]/10 px-2.5 py-0.5 rounded-md border border-[#0052d1]/20 font-mono">
                            {proximityRadius}m ({(proximityRadius / 1000).toFixed(2)} km)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="300"
                          max="3000"
                          step="50"
                          value={proximityRadius}
                          onChange={(e) => setProximityRadius(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0052d1]"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>300m (Stop)</span>
                          <span>1.5km (Town)</span>
                          <span>3km (District)</span>
                        </div>
                      </div>

                      {/* Coordinates Card */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <MapPin size={13} className="text-[#0052d1] dark:text-sky-400" />
                            <span>GPS Coordinates</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Auto-syncs with pin
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">
                              Latitude (N)
                            </span>
                            <input
                              type="number"
                              step="0.000001"
                              value={lat}
                              onChange={(e) => setLat(parseFloat(e.target.value) || lat)}
                              className="w-full h-9 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 transition-all"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">
                              Longitude (E)
                            </span>
                            <input
                              type="number"
                              step="0.000001"
                              value={lng}
                              onChange={(e) => setLng(parseFloat(e.target.value) || lng)}
                              className="w-full h-9 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Interactive Leaflet Map Only (Maximized Widescreen View) */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-2">
                      {/* Map Picker Frame - Expansive Full Area */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0">
                              <Crosshair size={14} />
                            </div>
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                              Interactive Map Pin Placement
                            </label>
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md">
                            Click map or drag 📍 marker
                          </span>
                        </div>
                        <div className="relative w-full h-[540px] xl:h-[570px] rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 shadow-md">
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
                            <MapZoomControls />
                          </MapContainer>
                          {/* Floating coordinates indicator badge on map */}
                          <div className="absolute top-3 left-3 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-md text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span className="font-mono">📍 Pin: {lat.toFixed(5)}° N, {lng.toFixed(5)}° E</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Media & Highlights */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Media Upload Zone */}
                    <div className="p-6 rounded-lg border-2 border-dashed border-[#0052d1]/30 bg-[#0052d1]/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-[#0052d1] dark:text-sky-400 flex items-center gap-2 uppercase tracking-wider">
                            <UploadCloud size={18} /> Photo &amp; Video Media
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Showcases displayed to commuters exploring destinations and booking trips.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex-1 h-11 rounded-lg bg-[#0052d1] hover:bg-[#206afa] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0052d1]/20 transition-all active:scale-95">
                          <ImageIcon size={16} />
                          <span>Upload Photos</span>
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>

                        <label className={cn(
                          "flex-1 h-11 rounded-lg text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95",
                          isUploadingVideo ? "bg-slate-600 cursor-not-allowed" : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 cursor-pointer"
                        )}>
                          {isUploadingVideo ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Uploading Video...</span>
                            </>
                          ) : (
                            <>
                              <Video size={16} />
                              <span>Upload Video</span>
                            </>
                          )}
                          <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideo} className="hidden" />
                        </label>
                      </div>

                      {videoUploadError && (
                        <p className="text-xs text-rose-600 font-semibold">⚠️ {videoUploadError}</p>
                      )}

                      {/* Preview Strip */}
                      {(images.length > 0 || videoUrl) && (
                        <div className="flex gap-3 overflow-x-auto pt-2 pb-1">
                          {images.map((imgUrl, idx) => {
                            const isCover = coverImageUrl === imgUrl || (!coverImageUrl && idx === 0);
                            return (
                              <div
                                key={`img-${idx}`}
                                onClick={() => setCoverImageUrl(imgUrl)}
                                title="Click to set as cover"
                                className={cn(
                                  "relative shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all shadow-sm",
                                  isCover ? "border-[#0052d1] ring-3 ring-[#0052d1]/30" : "border-slate-200 dark:border-slate-700"
                                )}
                              >
                                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                {isCover && (
                                  <div className="absolute bottom-0 inset-x-0 bg-[#0052d1] text-white text-[9px] font-black text-center py-0.5 tracking-wider">
                                    COVER PHOTO
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm hover:bg-rose-700"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}

                          {videoUrl && !isUploadingVideo && (
                            <div className="relative shrink-0 w-36 h-24 rounded-lg overflow-hidden border-2 border-purple-500 shadow-sm">
                              <video src={videoUrl} muted playsInline className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play size={24} className="text-white fill-white" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setVideoUrl('')}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm hover:bg-rose-700"
                                title="Remove video"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Explore Description */}
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                        Description &amp; Tourist Highlights
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Key attractions, visiting tips, and cultural stories displayed in the commuter app…"
                        rows={4}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1] focus:ring-3 focus:ring-[#0052d1]/15 transition-all resize-none"
                      />
                    </div>

                    {/* Audio Tour Guide */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                        <Music size={15} className="text-[#0052d1] dark:text-sky-400" />
                        <span>Spoken Audio Tour Guide</span>
                      </label>
                      <div className="flex gap-3 items-center">
                        <label className="h-11 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                          <UploadCloud size={16} />
                          <span>Upload MP3 Audio</span>
                          <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                        </label>
                        <input
                          type="text"
                          value={audioUrl}
                          onChange={(e) => setAudioUrl(e.target.value)}
                          placeholder="Or paste direct audio stream URL…"
                          className="flex-1 h-11 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                        />
                        {audioUrl && (
                          <button
                            type="button"
                            onClick={() => setAudioUrl('')}
                            className="h-11 px-3.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer hover:bg-rose-100"
                            title="Clear Audio"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {audioUrl && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <audio controls src={audioUrl} className="w-full h-8" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stepper Footer Controls */}
              <div className="modal-footer px-6 sm:px-8 py-4 bg-slate-50/60 dark:bg-slate-900/60">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="h-11 px-5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm cursor-pointer inline-flex items-center transition-all active:scale-95 shadow-xs"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  {currentStep === 2 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="h-11 px-5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2 transition-all active:scale-95 shadow-xs"
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
                        if (!locationName.trim()) {
                          setFormError('Please enter a Destination Location Name.');
                          return;
                        }
                        setFormError(null);
                        setCurrentStep(2);
                      }}
                      className="h-11 px-6 rounded-lg bg-[#0052d1] hover:bg-[#206afa] text-white font-black text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-[#0052d1]/25"
                    >
                      <span>Next: Media &amp; Highlights</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="h-11 px-7 rounded-lg bg-[#0052d1] hover:bg-[#206afa] text-white font-black text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-[#0052d1]/25"
                    >
                      <Check size={18} />
                      <span>{selectedFare ? 'Save & Enforce Rate' : 'Register Tariff Point'}</span>
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
