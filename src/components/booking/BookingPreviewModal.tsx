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
  ArrowRight,
  Clock,
  Circle
} from 'lucide-react';
import { Booking } from '../../types/database.types';

interface BookingPreviewModalProps {
  booking: Booking | null;
  onClose: () => void;
  onAccept: (booking: Booking) => void;
}

// Clean Minimal SVG Markers
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-minimal-passenger-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: absolute; width: 36px; height: 36px; background: rgba(0, 63, 135, 0.2); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background: #003f87; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,63,135,0.35); border: 2.5px solid #ffffff; z-index: 2;">
          <div style="width: 8px; height: 8px; background: #00C1FD; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-minimal-dest-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="background: #fcd400; color: #003f87; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(252,212,0,0.4); border: 2.5px solid #ffffff; z-index: 2;">
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

// Component to fit map bounds on route
const FitRouteBounds: React.FC<{ origin: [number, number]; destination: [number, number] }> = ({ origin, destination }) => {
  const map = useMap();
  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
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

  // Ensure coordinates are centered gracefully in Bauang area
  const rawOriginLat = booking.origin_lat || 16.5333;
  const rawOriginLng = booking.origin_lng || 120.3333;
  const rawDestLat = booking.destination_lat || 16.5385;
  const rawDestLng = booking.destination_lng || 120.3250;

  // Clamp if coordinates are wildly out of municipal bounds for local display
  const isBauangVicinity = (lat: number, lng: number) => lat >= 16.40 && lat <= 16.65 && lng >= 120.25 && lng <= 120.45;
  
  const originLat = isBauangVicinity(rawOriginLat, rawOriginLng) ? rawOriginLat : 16.5310;
  const originLng = isBauangVicinity(rawOriginLat, rawOriginLng) ? rawOriginLng : 120.3320;
  const destLat = isBauangVicinity(rawDestLat, rawDestLng) ? rawDestLat : 16.5385;
  const destLng = isBauangVicinity(rawDestLat, rawDestLng) ? rawDestLng : 120.3250;

  const originCoords: [number, number] = [originLat, originLng];
  const destCoords: [number, number] = [destLat, destLng];
  const routePolyline: [number, number][] = [originCoords, destCoords];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col relative">
        
        {/* Floating Minimal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-[500] w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-md flex items-center justify-center transition-all cursor-pointer"
          title="Isara"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean Map Section */}
        <div className="relative h-52 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <MapContainer
            center={originCoords}
            zoom={14}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitRouteBounds origin={originCoords} destination={destCoords} />

            {/* Passenger Pickup Marker */}
            <Marker position={originCoords} icon={createPassengerPickupIcon()}>
              <Popup>
                <div className="text-xs font-semibold">
                  <span className="text-[#003f87] font-bold block">Sakayan</span>
                  {booking.origin_name}
                </div>
              </Popup>
            </Marker>

            {/* Destination Marker */}
            <Marker position={destCoords} icon={createDestinationIcon()}>
              <Popup>
                <div className="text-xs font-semibold">
                  <span className="text-amber-600 font-bold block">Babaan</span>
                  {booking.destination_name}
                </div>
              </Popup>
            </Marker>

            {/* White Backdrop Polyline for High Contrast */}
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#ffffff',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />

            {/* Clean Blue Accent Route Path */}
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#003f87',
                weight: 4,
                opacity: 0.95,
                lineCap: 'round',
              }}
            />
          </MapContainer>

          {/* Simple Floating Route Badge */}
          <div className="absolute bottom-2.5 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#003f87]"></span>
            <span>{booking.estimated_distance_km} km</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-500 font-medium">{booking.estimated_duration_min} min biyahe</span>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-5 space-y-4">
          
          {/* Minimal Vertical Itinerary */}
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-[#003f87] flex items-center justify-center text-white mt-0.5 shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 bg-[#00C1FD] rounded-full"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sakayan (Pickup)
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {booking.origin_name}
                </div>
              </div>
            </div>

            {/* Connecting line */}
            <div className="border-l-2 border-dashed border-slate-200 dark:border-slate-700 ml-2 h-2.5"></div>

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-[#fcd400] flex items-center justify-center text-[#003f87] mt-0.5 shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 bg-[#003f87] rounded-full"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Babaan (Destination)
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {booking.destination_name}
                </div>
              </div>
            </div>
          </div>

          {/* Clean Fare Display */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                Regulated Fare (Taripa)
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Standard LGU Bauang rate
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
              className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
