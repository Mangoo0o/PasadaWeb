import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  X, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Bike, 
  User, 
  Clock, 
  Sparkles,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Booking } from '../../types/database.types';

interface BookingPreviewModalProps {
  booking: Booking | null;
  onClose: () => void;
  onAccept: (booking: Booking) => void;
}

// Custom Leaflet Markers with distinct styling
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-preview-passenger-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <div style="position: absolute; width: 44px; height: 44px; background: rgba(0, 193, 253, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background: linear-gradient(135deg, #003f87, #0056b3); color: #00C1FD; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,63,135,0.45); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-preview-dest-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <div style="position: absolute; width: 44px; height: 44px; background: rgba(252, 212, 0, 0.35); border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
        <div style="background: linear-gradient(135deg, #fcd400, #e5be00); color: #003f87; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(252,212,0,0.5); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
  });
};

// Component to fit map bounds on route
const FitRouteBounds: React.FC<{ origin: [number, number]; destination: [number, number] }> = ({ origin, destination }) => {
  const map = useMap();
  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, origin, destination]);
  return null;
};

export const BookingPreviewModal: React.FC<BookingPreviewModalProps> = ({
  booking,
  onClose,
  onAccept,
}) => {
  if (!booking) return null;

  const originLat = booking.origin_lat || 16.5333;
  const originLng = booking.origin_lng || 120.3333;
  const destLat = booking.destination_lat || 16.5385;
  const destLng = booking.destination_lng || 120.3250;

  const originCoords: [number, number] = [originLat, originLng];
  const destCoords: [number, number] = [destLat, destLng];
  const routePolyline: [number, number][] = [originCoords, destCoords];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#003f87] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-[#00C1FD]">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                Detalye ng Tawag ng Pasahero
              </h3>
              <p className="text-[10px] text-sky-200 font-medium">
                Live Route &amp; Pickup Preview
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Leaflet Map Preview */}
        <div className="relative h-64 w-full bg-slate-100 dark:bg-slate-800">
          <MapContainer
            center={originCoords}
            zoom={14}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fit Map Bounds */}
            <FitRouteBounds origin={originCoords} destination={destCoords} />

            {/* Passenger Pickup Pin */}
            <Marker position={originCoords} icon={createPassengerPickupIcon()}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-[#003f87] block">Sakayan ng Pasahero</strong>
                  <span>{booking.origin_name}</span>
                </div>
              </Popup>
            </Marker>

            {/* Destination Pin */}
            <Marker position={destCoords} icon={createDestinationIcon()}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-amber-600 block">Babaan (Destination)</strong>
                  <span>{booking.destination_name}</span>
                </div>
              </Popup>
            </Marker>

            {/* Distinctive Glow Outline Path */}
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#ffffff',
                weight: 8,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Distinctive Colored Route Path (Electric Neon Amber / Orange with Dash styling) */}
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#FF6B00',
                weight: 5,
                opacity: 1,
                dashArray: '10, 8',
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </MapContainer>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-2 left-2 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-2 text-[10px] font-bold border border-slate-200 dark:border-slate-700 shadow-md space-y-1">
            <div className="flex items-center gap-1.5 text-[#003f87] dark:text-[#00C1FD]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#003f87]"></div>
              <span>Sakayan (Passenger)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <div className="w-2.5 h-2.5 rounded-full bg-[#fcd400]"></div>
              <span>Babaan (Destination)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#FF6B00]">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-[#FF6B00]"></div>
              <span>Ruta ng Biyahe</span>
            </div>
          </div>
        </div>

        {/* Route Details Card */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Origin and Destination Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#003f87] mt-1 shrink-0"></div>
              <div>
                <div className="text-[10px] uppercase font-black text-slate-400">Sakayan (Pickup Location)</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{booking.origin_name}</div>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-600 ml-1.5 h-4"></div>

            <div className="flex items-start gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#fcd400] mt-1 shrink-0"></div>
              <div>
                <div className="text-[10px] uppercase font-black text-slate-400">Babaan (Destination)</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{booking.destination_name}</div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-2.5 border border-emerald-200 dark:border-emerald-800">
              <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Taripa</div>
              <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">
                ₱{booking.estimated_fare.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Distansya</div>
              <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                {booking.estimated_distance_km} km
              </div>
            </div>

            <div className="bg-sky-50 dark:bg-sky-950/40 rounded-xl p-2.5 border border-sky-200 dark:border-sky-800">
              <div className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase">Tantiya</div>
              <div className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-400">
                {booking.estimated_duration_min} min
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Isara
            </button>

            <button
              onClick={() => onAccept(booking)}
              className="flex-2 py-3.5 rounded-xl bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#003f87]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
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
