import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  PhoneCall, 
  Navigation, 
  Bike, 
  CheckCircle2, 
  X, 
  MapPin, 
  Sparkles,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Booking } from '../types/database.types';
import { updateBookingStatus } from '../services/bookingService';

interface DriverTravelPageProps {
  booking: Booking;
  driverLat?: number;
  driverLng?: number;
  onExitTravel: () => void;
}

// Custom Driver Tricycle Icon
const createDriverTricycleIcon = () => {
  return L.divIcon({
    className: 'custom-driver-pin',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #00A3FF; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 36px; height: 36px; border-radius: 9999px; background-color: #003f87; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Custom Passenger Pickup Icon
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-pickup-pin',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #00A3FF; opacity: 0.25; animation: pulse 2s infinite;"></div>
        <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: #00A3FF; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,163,255,0.45); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

// Custom Destination Drop-off Icon
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #FF6B00; opacity: 0.25; animation: pulse 2s infinite;"></div>
        <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: #FF6B00; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(255,107,0,0.45); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

// Safe Auto-Fit Route Camera Bounds
const AutoFitRoute: React.FC<{ points: [number, number][]; trigger: string }> = ({ points, trigger }) => {
  const map = useMap();
  useEffect(() => {
    let timer: any;
    if (!map || !(map as any)._mapPane) return;

    timer = setTimeout(() => {
      try {
        if (!map || !(map as any)._mapPane) return;
        if (points.length >= 2) {
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, {
            paddingTopLeft: [90, 40],
            paddingBottomRight: [140, 40],
            maxZoom: 16.5,
            animate: false,
          });
        } else if (points.length === 1) {
          map.setView(points[0], 16, { animate: false });
        }
      } catch {}
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [map, points, trigger]);
  return null;
};

// Fetch OSRM Road GeoJSON
const fetchOSRMRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM error');
    const data = await res.json();
    if (data.routes && data.routes[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch {}
  return [start, end];
};

export const DriverTravelPage: React.FC<DriverTravelPageProps> = ({
  booking,
  driverLat,
  driverLng,
  onExitTravel,
}) => {
  // 1. Initial coordinates from props / booking data
  const initialDriverLat = Number(driverLat) || 16.5333;
  const initialDriverLng = Number(driverLng) || 120.3333;
  const [driverCoords, setDriverCoords] = useState<[number, number]>([initialDriverLat, initialDriverLng]);

  const passengerPickupCoords: [number, number] = [
    Number(booking.origin_lat) || 16.5310,
    Number(booking.origin_lng) || 120.3320,
  ];

  const destinationDropCoords: [number, number] = [
    Number(booking.destination_lat) || 16.5385,
    Number(booking.destination_lng) || 120.3250,
  ];

  // Real-time live GPS tracking for driver movement
  useEffect(() => {
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setDriverCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }
    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const [tripState, setTripState] = useState<'assigned' | 'arrived' | 'in_transit' | 'completed'>(() => {
    if (booking.status === 'driver_arrived') return 'arrived';
    if (booking.status === 'in_transit') return 'in_transit';
    return 'assigned';
  });

  // Phase 1 Route: Driver -> Passenger Pickup (Cyan)
  const [roadToPickup, setRoadToPickup] = useState<[number, number][]>([
    driverCoords,
    passengerPickupCoords,
  ]);

  // Phase 2 Route: Driver / Pickup -> Destination Drop-off (Orange)
  const [roadToDestination, setRoadToDestination] = useState<[number, number][]>([
    passengerPickupCoords,
    destinationDropCoords,
  ]);

  const [completedFare, setCompletedFare] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Dynamically update road polyline matching the active phase
  useEffect(() => {
    let active = true;

    if (tripState === 'assigned' || tripState === 'arrived') {
      // Phase 1: Route to Passenger Pickup
      fetchOSRMRoute(driverCoords, passengerPickupCoords).then((road) => {
        if (active) setRoadToPickup(road);
      });
    } else if (tripState === 'in_transit') {
      // Phase 2: Route from Current Location to Destination
      fetchOSRMRoute(driverCoords, destinationDropCoords).then((road) => {
        if (active) setRoadToDestination(road);
      });
    }

    return () => {
      active = false;
    };
  }, [tripState, booking.id, driverCoords[0], driverCoords[1]]);

  // Stage Action Handlers
  const handleArrivePickup = async () => {
    setTripState('arrived');
    await updateBookingStatus(booking.id, 'driver_arrived', booking.driver_id);
  };

  const handleStartTrip = async () => {
    setTripState('in_transit');
    await updateBookingStatus(booking.id, 'in_transit', booking.driver_id);
  };

  const handleCompleteTrip = async () => {
    const fare = booking.estimated_fare;
    setTripState('completed');
    setCompletedFare(fare);
    await updateBookingStatus(booking.id, 'completed', booking.driver_id, fare);
  };

  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancelTrip = async () => {
    setIsCancelling(true);
    await updateBookingStatus(booking.id, 'cancelled');
    setIsCancelling(false);
    setShowCancelModal(false);
    onExitTravel();
  };

  const isHeadingToPickup = tripState === 'assigned' || tripState === 'arrived';
  const activeFocusPoints = isHeadingToPickup
    ? [driverCoords, passengerPickupCoords]
    : [driverCoords, destinationDropCoords];

  return (
    <div className="fixed inset-0 z-[9999] w-full h-full bg-slate-950 flex flex-col overflow-hidden font-sans">
      
      {/* 1. TOP DUAL-LOCATION HUD BAR */}
      <div className="absolute top-4 left-3 right-3 max-w-lg mx-auto z-[10000] pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
          
          {/* Header Row: Active Phase Badge + Phone Action + Fare */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full ${isHeadingToPickup ? 'bg-[#00A3FF]' : 'bg-[#FF6B00]'} animate-pulse shrink-0`}></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                {isHeadingToPickup ? '1. Pupunta sa Sakayan' : '2. Patungo sa Babaan'}
              </span>
              {booking.passenger?.full_name && (
                <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                  • {booking.passenger.full_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {booking.passenger?.phone_number && (
                <a
                  href={`tel:${booking.passenger.phone_number}`}
                  className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center transition-transform active:scale-95"
                  title="Tawagan ang Pasahero"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
              )}
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-[#003f87] dark:text-[#00C1FD]">
                  ₱{booking.estimated_fare.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Location Stack Matching User Design */}
          <div className="space-y-1 px-0.5">
            {/* SAKAYAN */}
            <div className="flex items-start gap-2.5">
              <div className={`w-3 h-3 rounded-full bg-[#00A3FF] shrink-0 mt-0.5 ${
                isHeadingToPickup ? 'ring-4 ring-[#00A3FF]/25 shadow-sm' : 'opacity-70'
              }`}></div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-black text-[#00A3FF] block tracking-wider leading-none">
                  SAKAYAN
                </span>
                <span className={`text-xs truncate block mt-0.5 ${
                  isHeadingToPickup ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}>
                  {booking.origin_name}
                </span>
              </div>
            </div>

            {/* Connecting Vertical Line */}
            <div className="border-l border-dashed border-slate-300 dark:border-slate-600 ml-1.5 h-2.5"></div>

            {/* BABAAN */}
            <div className="flex items-start gap-2.5">
              <div className={`w-3 h-3 rounded-full bg-[#FF6B00] shrink-0 mt-0.5 ${
                !isHeadingToPickup ? 'ring-4 ring-[#FF6B00]/25 shadow-sm' : 'opacity-70'
              }`}></div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-black text-[#FF6B00] block tracking-wider leading-none">
                  BABAAN
                </span>
                <span className={`text-xs truncate block mt-0.5 ${
                  !isHeadingToPickup ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}>
                  {booking.destination_name}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. FULL-BLEED 100% ROAD MAP */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          center={isHeadingToPickup ? passengerPickupCoords : destinationDropCoords}
          zoom={15}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AutoFitRoute points={activeFocusPoints} trigger={tripState} />

          {isHeadingToPickup ? (
            <>
              {/* Path 1: Driver to Passenger Pickup (Cyan Dashed) */}
              <Polyline
                positions={roadToPickup}
                pathOptions={{
                  color: '#00A3FF',
                  weight: 7,
                  opacity: 0.95,
                  dashArray: '10, 10',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Marker position={driverCoords} icon={createDriverTricycleIcon()} />
              <Marker position={passengerPickupCoords} icon={createPassengerPickupIcon()} />
            </>
          ) : (
            <>
              {/* Path 2: Driver to Drop-off Destination (Orange Solid) */}
              <Polyline
                positions={roadToDestination}
                pathOptions={{
                  color: '#FF6B00',
                  weight: 7,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Marker position={driverCoords} icon={createDriverTricycleIcon()} />
              <Marker position={destinationDropCoords} icon={createDestinationIcon()} />
            </>
          )}
        </MapContainer>
      </div>

      {/* 3. BOTTOM FLOATING ACTION CONTROLS & STAGE STEPPER */}
      <div className="absolute bottom-6 left-3 right-3 max-w-lg mx-auto z-[10000] pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
          
          {/* Stage Progression Stepper with Checkmarks */}
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            {/* Stage 1: Sunduin sa Sakayan */}
            <div className={`flex items-center gap-1.5 font-black text-[11px] ${
              tripState === 'assigned'
                ? 'text-[#00A3FF]'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {tripState === 'arrived' || tripState === 'in_transit' || tripState === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-[#00A3FF] bg-[#00A3FF]/10 flex items-center justify-center text-[10px] text-[#00A3FF] shrink-0 animate-pulse">
                  1
                </span>
              )}
              <span className="truncate">Sunduin sa Sakayan</span>
            </div>

            {/* Connecting Line */}
            <div className={`flex-1 h-0.5 mx-2 rounded-full ${
              tripState === 'in_transit' || tripState === 'completed'
                ? 'bg-emerald-500'
                : 'bg-slate-200 dark:bg-slate-700'
            }`} />

            {/* Stage 2: Ihatid sa Destinasyon */}
            <div className={`flex items-center gap-1.5 font-black text-[11px] ${
              tripState === 'in_transit'
                ? 'text-[#FF6B00]'
                : tripState === 'completed'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}>
              {tripState === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : tripState === 'in_transit' ? (
                <span className="w-4 h-4 rounded-full border-2 border-[#FF6B00] bg-[#FF6B00]/10 flex items-center justify-center text-[10px] text-[#FF6B00] shrink-0 animate-pulse">
                  2
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                  2
                </span>
              )}
              <span className="truncate">Ihatid sa Destinasyon</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-0.5">
            {/* Cancel Button */}
            {tripState !== 'completed' && (
              <button
                onClick={handleOpenCancelModal}
                className="px-4 py-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all active:scale-95 shrink-0 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>I-cancel</span>
              </button>
            )}

            {/* Primary Action Button */}
            <div className="flex-1">
              {tripState === 'assigned' && (
                <button
                  onClick={handleArrivePickup}
                  className="w-full py-3.5 px-4 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#003f87]/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Navigation className="w-4 h-4 text-[#00C1FD]" />
                  <span>Nasa Sakayan Na</span>
                </button>
              )}

              {tripState === 'arrived' && (
                <button
                  onClick={handleStartTrip}
                  className="w-full py-3.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Bike className="w-4 h-4 text-white" />
                  <span>Simulan ang Byahe</span>
                </button>
              )}

              {tripState === 'in_transit' && (
                <button
                  onClick={handleCompleteTrip}
                  className="w-full py-3.5 px-4 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#003f87]/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
                  <span>Tapusin ang Byahe (₱{booking.estimated_fare.toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 4. TRIP COMPLETED SETTLEMENT MODAL */}
      {completedFare !== null && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Matagumpay na Naitawid!
              </h3>
              <p className="text-xs text-slate-500">
                Naihatid nang maayos ang pasahero sa destinasyon.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300">
                Singiling Pamasahe (Cash)
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₱{completedFare.toFixed(2)}
              </div>
            </div>

            <button
              onClick={onExitTravel}
              className="w-full py-3.5 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm shadow-md shadow-[#003f87]/20 active:scale-98 transition-all cursor-pointer"
            >
              Bumalik sa Pila ng Terminal
            </button>
          </div>
        </div>
      )}

      {/* 5. CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Kanselahin ang Biyahe?
              </h3>
              <p className="text-xs text-slate-500">
                Sigurado ka bang nais mong kanselahin ang biyahe na ito? Magiging bukas muli ang iyong linya sa ibang pasahero.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                disabled={isCancelling}
                onClick={handleConfirmCancelTrip}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Kinakansela...' : 'Oo, Kanselahin'}
              </button>
              <button
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Huwag Kanselahin (Bumalik sa Biyahe)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverTravelPage;
