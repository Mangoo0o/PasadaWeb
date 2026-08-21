import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  X, 
  CheckCircle2, 
  Bike, 
  Clock,
  Navigation
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
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
        <div style="position: absolute; width: 38px; height: 38px; background: rgba(0, 193, 253, 0.4); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background: linear-gradient(135deg, #003f87, #002244); color: #00C1FD; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,63,135,0.45); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -16],
  });
};

// 2. Passenger Pickup Marker
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-passenger-pickup-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: absolute; width: 36px; height: 36px; background: rgba(0, 163, 255, 0.3); border-radius: 50%; animation: pulse 2s infinite;"></div>
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

// Auto focus tightly on the passenger's pickup and destination with safe non-colliding bounds
const FitPassengerFocusBounds: React.FC<{ 
  passengerCoords: [number, number]; 
  destinationCoords: [number, number]; 
}> = ({ passengerCoords, destinationCoords }) => {
  const map = useMap();
  useEffect(() => {
    let timer: any;
    if (!map || !(map as any)._mapPane) return;

    timer = setTimeout(() => {
      try {
        if (!map || !(map as any)._mapPane) return;
        if (passengerCoords && destinationCoords) {
          const bounds = L.latLngBounds([passengerCoords, destinationCoords]);
          map.fitBounds(bounds, { 
            paddingTopLeft: [40, 30],
            paddingBottomRight: [80, 30],
            maxZoom: 16.5,
            animate: false
          });
        } else if (passengerCoords) {
          map.setView(passengerCoords, 16, { animate: false });
        }
      } catch {}
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [map, passengerCoords, destinationCoords]);
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
    // fallback
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

  // Coordinate Sanitization / Bauang Vicinity Checks
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
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md h-[640px] sm:h-[700px] max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col relative">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[500] w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-md"
          title="Isara"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Floating Mini Legend */}
        <div className="absolute top-4 left-4 z-[500] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full px-3 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/60 dark:border-slate-700 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#00A3FF]">
            <span className="w-2.5 h-1 border-t-2 border-dashed border-[#00A3FF]"></span>
            <span>Papunta sa Sakayan</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FF6B00]">
            <span className="w-2.5 h-1 bg-[#FF6B00] rounded-full"></span>
            <span>Ruta ng Pasahero</span>
          </div>
        </div>

        {/* 1. FULL-MODAL BLEED MAP (Auto centered on Passenger) */}
        <div className="absolute inset-0 w-full h-full z-0 bg-slate-100 dark:bg-slate-800">
          <MapContainer
            center={passengerPickupCoords}
            zoom={15}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitPassengerFocusBounds
              passengerCoords={passengerPickupCoords}
              destinationCoords={destinationDropCoords}
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
            <Polyline
              positions={driverToPassengerRoad}
              pathOptions={{
                color: '#ffffff',
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
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

            {/* ═══════════ LEG 2: Passenger to Destination Road Path (Vibrant Orange) ═══════════ */}
            <Polyline
              positions={passengerToDestRoad}
              pathOptions={{
                color: '#ffffff',
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
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
        </div>

        {/* 2. SMOOTH GRADIENT OVERLAY (Fades smoothly to transparent upward so map is visible) */}
        <div className="absolute bottom-0 left-0 right-0 z-[400] pt-16 pb-5 px-5 bg-gradient-to-t from-white via-white/95 via-70% to-transparent dark:from-slate-950 dark:via-slate-950/95 dark:via-70% dark:to-transparent flex flex-col space-y-3.5 pointer-events-auto">
          
          {/* Simple Clean Route Summary Directly on Gradient */}
          <div className="space-y-2 px-1">
            {/* Pickup */}
            <div className="flex items-start gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00A3FF] ring-4 ring-[#00A3FF]/20 shrink-0 mt-1"></div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase font-black text-[#00A3FF] block tracking-wider">
                  Sakayan
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                  {booking.origin_name}
                </span>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-700 ml-1 h-2"></div>

            {/* Destination */}
            <div className="flex items-start gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] ring-4 ring-[#FF6B00]/20 shrink-0 mt-1"></div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase font-black text-[#FF6B00] block tracking-wider">
                  Babaan
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                  {booking.destination_name}
                </span>
              </div>
            </div>
          </div>

          {/* Fare & Trip Metrics Bar */}
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                Regulated Fare (Taripa)
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {booking.estimated_distance_km} km • ~{booking.estimated_duration_min} min biyahe
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-[#003f87] dark:text-[#00C1FD]">
                ₱{booking.estimated_fare.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div>
            <button
              onClick={() => onAccept(booking)}
              className="w-full py-3.5 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm shadow-xl shadow-[#003f87]/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
              <span>Tanggapin ang Biyahe</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BookingPreviewModal;
