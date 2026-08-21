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
  AlertCircle
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
  const isBauangVicinity = (lat: number, lng: number) => lat >= 16.40 && lat <= 16.65 && lng >= 120.25 && lng <= 120.45;

  const rawDriverLat = driverLat || 16.5333;
  const rawDriverLng = driverLng || 120.3333;
  const currentDriverCoords: [number, number] = [
    isBauangVicinity(rawDriverLat, rawDriverLng) ? rawDriverLat : 16.5333,
    isBauangVicinity(rawDriverLat, rawDriverLng) ? rawDriverLng : 120.3333,
  ];

  const rawOriginLat = booking.origin_lat || 16.5310;
  const rawOriginLng = booking.origin_lng || 120.3320;
  const passengerPickupCoords: [number, number] = [
    isBauangVicinity(rawOriginLat, rawOriginLng) ? rawOriginLat : 16.5310,
    isBauangVicinity(rawOriginLat, rawOriginLng) ? rawOriginLng : 120.3320,
  ];

  const rawDestLat = booking.destination_lat || 16.5385;
  const rawDestLng = booking.destination_lng || 120.3250;
  const destinationDropCoords: [number, number] = [
    isBauangVicinity(rawDestLat, rawDestLng) ? rawDestLat : 16.5385,
    isBauangVicinity(rawDestLat, rawDestLng) ? rawDestLng : 120.3250,
  ];

  const [tripState, setTripState] = useState<'assigned' | 'arrived' | 'in_transit' | 'completed'>(() => {
    if (booking.status === 'driver_arrived') return 'arrived';
    if (booking.status === 'in_transit') return 'in_transit';
    return 'assigned';
  });

  const [roadToPickup, setRoadToPickup] = useState<[number, number][]>([
    currentDriverCoords,
    passengerPickupCoords,
  ]);

  const [roadToDestination, setRoadToDestination] = useState<[number, number][]>([
    passengerPickupCoords,
    destinationDropCoords,
  ]);

  const [completedFare, setCompletedFare] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchOSRMRoute(currentDriverCoords, passengerPickupCoords),
      fetchOSRMRoute(passengerPickupCoords, destinationDropCoords),
    ]).then(([road1, road2]) => {
      if (active) {
        setRoadToPickup(road1);
        setRoadToDestination(road2);
      }
    });

    return () => {
      active = false;
    };
  }, [booking.id, driverLat, driverLng]);

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

  const handleCancelTrip = async () => {
    if (window.confirm('Sigurado ka bang nais mong kanselahin ang biyahe?')) {
      await updateBookingStatus(booking.id, 'cancelled');
      onExitTravel();
    }
  };

  const isHeadingToPickup = tripState === 'assigned' || tripState === 'arrived';
  const activeFocusPoints = isHeadingToPickup
    ? [currentDriverCoords, passengerPickupCoords]
    : [passengerPickupCoords, destinationDropCoords];

  return (
    <div className="fixed inset-0 z-[9999] w-full h-full bg-slate-950 flex flex-col overflow-hidden font-sans">
      
      {/* 1. TOP MINIMAL HUD BAR */}
      <div className="absolute top-4 left-3 right-3 max-w-lg mx-auto z-[10000] pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isHeadingToPickup ? 'bg-[#00A3FF]' : 'bg-[#FF6B00]'} animate-ping`}></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isHeadingToPickup ? '1. Pupunta sa Sakayan' : '2. Patungo sa Destinasyon'}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
              {isHeadingToPickup ? booking.origin_name : booking.destination_name}
            </div>
            {booking.passenger?.full_name && (
              <div className="text-[11px] font-semibold text-slate-500 truncate">
                Pasahero: {booking.passenger.full_name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {booking.passenger?.phone_number && (
              <a
                href={`tel:${booking.passenger.phone_number}`}
                className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center transition-transform active:scale-95"
                title="Tawagan ang Pasahero"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            )}
            <div className="text-right pl-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Taripa</span>
              <span className="text-sm sm:text-base font-black text-[#003f87] dark:text-[#00C1FD]">
                ₱{booking.estimated_fare.toFixed(2)}
              </span>
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
              <Marker position={currentDriverCoords} icon={createDriverTricycleIcon()} />
              <Marker position={passengerPickupCoords} icon={createPassengerPickupIcon()} />
            </>
          ) : (
            <>
              {/* Path 2: Passenger Pickup to Drop-off Destination (Orange Solid) */}
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
              <Marker position={passengerPickupCoords} icon={createDriverTricycleIcon()} />
              <Marker position={destinationDropCoords} icon={createDestinationIcon()} />
            </>
          )}
        </MapContainer>
      </div>

      {/* 3. BOTTOM FLOATING ACTION CONTROLS */}
      <div className="absolute bottom-6 left-3 right-3 max-w-lg mx-auto z-[10000] pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex items-center gap-2">
          
          {/* Cancel Button */}
          {tripState !== 'completed' && (
            <button
              onClick={handleCancelTrip}
              className="px-4 py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors active:scale-95 shrink-0 cursor-pointer flex items-center gap-1"
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
                className="w-full py-3.5 rounded-xl bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#003f87]/30 transition-all active:scale-95 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-[#00C1FD]" />
                <span>Nakarating na sa Sakayan</span>
              </button>
            )}

            {tripState === 'arrived' && (
              <button
                onClick={handleStartTrip}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer animate-pulse"
              >
                <Bike className="w-4 h-4 text-white" />
                <span>Simulan ang Byahe (Pasahero Nakasakay Na)</span>
              </button>
            )}

            {tripState === 'in_transit' && (
              <button
                onClick={handleCompleteTrip}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#003f87] to-[#0056b3] hover:from-[#002f66] hover:to-[#003f87] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#003f87]/30 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
                <span>Tapusin at Singilin (₱{booking.estimated_fare.toFixed(2)})</span>
              </button>
            )}
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

    </div>
  );
};

export default DriverTravelPage;
