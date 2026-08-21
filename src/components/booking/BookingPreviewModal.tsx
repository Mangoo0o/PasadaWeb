import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  X, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Bike, 
  ArrowRight,
  Clock,
  Circle,
  User
} from 'lucide-react';
import { Booking } from '../../types/database.types';

interface BookingPreviewModalProps {
  booking: Booking | null;
  driverLat?: number;
  driverLng?: number;
  onClose: () => void;
  onAccept: (booking: Booking) => void;
}

// 1. Driver Tricycle Marker
const createDriverTricycleIcon = () => {
  return L.divIcon({
    className: 'custom-driver-tricycle-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
        <div style="position: absolute; width: 40px; height: 40px; background: rgba(0, 193, 253, 0.35); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background: linear-gradient(135deg, #003f87, #002244); color: #00C1FD; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,63,135,0.45); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  });
};

// 2. Passenger Pickup Marker
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-passenger-pickup-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: absolute; width: 36px; height: 36px; background: rgba(0, 163, 255, 0.25); border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="background: #00A3FF; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,163,255,0.4); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  });
};

// 3. Drop-off Destination Marker
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="background: #FF6B00; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,107,0,0.45); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  });
};

// Auto fit bounds for all 3 points
const FitMultiBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }, [map, points]);
  return null;
};

// Helper to fetch actual road coordinates from OSRM
const fetchOSRMRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM error');
    const data = await res.json();
    if (data.routes && data.routes[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch {
    // fallback straight line if offline/rate-limited
  }
  return [start, end];
};

export const BookingPreviewModal: React.FC<BookingPreviewModalProps> = ({
  booking,
  driverLat,
  driverLng,
  onClose,
  onAccept,
}) => {
  if (!booking) return null;

  // 1. Coordinate Sanitization / Bauang Vicinity Checks
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

  // 2. Road Network Polylines State
  const [driverToPassengerRoad, setDriverToPassengerRoad] = useState<[number, number][]>([
    currentDriverCoords,
    passengerPickupCoords,
  ]);

  const [passengerToDestRoad, setPassengerToDestRoad] = useState<[number, number][]>([
    passengerPickupCoords,
    destinationDropCoords,
  ]);

  useEffect(() => {
    let active = true;

    // Fetch road paths concurrently
    Promise.all([
      fetchOSRMRoute(currentDriverCoords, passengerPickupCoords),
      fetchOSRMRoute(passengerPickupCoords, destinationDropCoords),
    ]).then(([road1, road2]) => {
      if (active) {
        setDriverToPassengerRoad(road1);
        setPassengerToDestRoad(road2);
      }
    });

    return () => {
      active = false;
    };
  }, [booking.id, driverLat, driverLng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col relative max-h-[92vh]">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-[500] w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-md flex items-center justify-center transition-all cursor-pointer"
          title="Isara"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Road Navigation Map View */}
        <div className="relative h-60 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <MapContainer
            center={currentDriverCoords}
            zoom={14}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Auto fit all 3 points */}
            <FitMultiBounds
              points={[currentDriverCoords, passengerPickupCoords, destinationDropCoords]}
            />

            {/* Marker 1: Driver Current Location */}
            <Marker position={currentDriverCoords} icon={createDriverTricycleIcon()}>
              <Popup>
                <div className="text-xs font-semibold">
                  <span className="text-[#003f87] font-bold block">Lokasyon Mo (Driver)</span>
                  Kasalukuyang puwesto
                </div>
              </Popup>
            </Marker>

            {/* Marker 2: Passenger Pickup */}
            <Marker position={passengerPickupCoords} icon={createPassengerPickupIcon()}>
              <Popup>
                <div className="text-xs font-semibold">
                  <span className="text-[#00A3FF] font-bold block">Sakayan (Pickup)</span>
                  {booking.origin_name}
                </div>
              </Popup>
            </Marker>

            {/* Marker 3: Booking Destination */}
            <Marker position={destinationDropCoords} icon={createDestinationIcon()}>
              <Popup>
                <div className="text-xs font-semibold">
                  <span className="text-[#FF6B00] font-bold block">Babaan (Destination)</span>
                  {booking.destination_name}
                </div>
              </Popup>
            </Marker>

            {/* ═══════════ LEG 1: Driver to Passenger Road Path (Cyan / Sky Blue) ═══════════ */}
            {/* White Glow Backdrop */}
            <Polyline
              positions={driverToPassengerRoad}
              pathOptions={{
                color: '#ffffff',
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
            {/* Electric Sky Blue Road Path */}
            <Polyline
              positions={driverToPassengerRoad}
              pathOptions={{
                color: '#00A3FF',
                weight: 5,
                opacity: 1,
                dashArray: '8, 6',
                lineCap: 'round',
              }}
            />

            {/* ═══════════ LEG 2: Passenger to Destination Road Path (Vibrant Neon Orange) ═══════════ */}
            {/* White Glow Backdrop */}
            <Polyline
              positions={passengerToDestRoad}
              pathOptions={{
                color: '#ffffff',
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
            {/* Solid Vibrant Orange Road Path */}
            <Polyline
              positions={passengerToDestRoad}
              pathOptions={{
                color: '#FF6B00',
                weight: 5,
                opacity: 1,
                lineCap: 'round',
              }}
            />
          </MapContainer>

          {/* Clean Interactive Map Legend */}
          <div className="absolute bottom-2.5 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl px-3 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-md flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#00A3FF]">
              <span className="w-2.5 h-1 border-t-2 border-dashed border-[#00A3FF]"></span>
              <span>Papunta sa Sakayan</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#FF6B00]">
              <span className="w-2.5 h-1 bg-[#FF6B00] rounded-full"></span>
              <span>Ruta ng Pasahero</span>
            </div>
          </div>
        </div>

        {/* 2. Route & Tariff Summary Details */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Connected 3-Step Journey Timeline */}
          <div className="bg-slate-50/90 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
            
            {/* Step 1: Driver Location */}
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-[#003f87] text-[#00C1FD] flex items-center justify-center mt-0.5 shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 bg-[#00C1FD] rounded-full"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Iyong Puwesto (Driver)
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Kasalukuyang Lokasyon sa Bauang
                </div>
              </div>
            </div>

            {/* Cyan Dotted Road Segment */}
            <div className="border-l-2 border-dashed border-[#00A3FF] ml-2 h-3"></div>

            {/* Step 2: Passenger Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-[#00A3FF] flex items-center justify-center text-white mt-0.5 shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-black text-[#00A3FF] tracking-wider">
                  Sakayan (Pickup)
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {booking.origin_name}
                </div>
              </div>
            </div>

            {/* Orange Solid Road Segment */}
            <div className="border-l-2 border-[#FF6B00] ml-2 h-3"></div>

            {/* Step 3: Drop-off Destination */}
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-[#FF6B00] flex items-center justify-center text-white mt-0.5 shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-black text-[#FF6B00] tracking-wider">
                  Babaan (Destination)
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {booking.destination_name}
                </div>
              </div>
            </div>
          </div>

          {/* Fare & Trip Metrics */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#003f87]/5 dark:bg-sky-950/30 border border-[#003f87]/15 dark:border-sky-800/40">
            <div>
              <div className="text-[10px] uppercase font-black text-[#003f87] dark:text-sky-300 tracking-wider">
                Regulated Fare (Taripa)
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {booking.estimated_distance_km} km • ~{booking.estimated_duration_min} min biyahe
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-[#003f87] dark:text-[#00C1FD]">
                ₱{booking.estimated_fare.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onAccept(booking)}
              className="w-full py-3.5 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm shadow-md shadow-[#003f87]/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
              <span>Tanggapin ang Biyahe</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Isara
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BookingPreviewModal;
