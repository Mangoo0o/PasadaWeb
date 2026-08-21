import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Booking } from '../../types/database.types';

interface DriverActiveTripMapProps {
  booking: Booking;
  driverLat?: number;
  driverLng?: number;
  tripState: 'assigned' | 'arrived' | 'in_transit' | 'completed';
}

// Custom Driver Tricycle Icon
const createDriverTricycleIcon = () => {
  return L.divIcon({
    className: 'custom-driver-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #00A3FF; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: #003f87; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  });
};

// Custom Passenger Pickup Icon
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-pickup-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: #00A3FF; border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(0,163,255,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
};

// Custom Drop-off Destination Icon
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: #FF6B00; border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(255,107,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
};

// Camera bounds auto-focuser
const AutoFitActiveRoute: React.FC<{ 
  points: [number, number][];
  tripState: string;
}> = ({ points, tripState }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { 
        padding: [40, 40],
        maxZoom: 16.5
      });
      if (map.getZoom() < 15) {
        map.setZoom(15);
      }
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    }
  }, [map, points, tripState]);
  return null;
};

// Helper to fetch road polyline from OSRM
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

export const DriverActiveTripMap: React.FC<DriverActiveTripMapProps> = ({
  booking,
  driverLat,
  driverLng,
  tripState,
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

  const [roadToPickup, setRoadToPickup] = useState<[number, number][]>([
    currentDriverCoords,
    passengerPickupCoords,
  ]);

  const [roadToDestination, setRoadToDestination] = useState<[number, number][]>([
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
        setRoadToPickup(road1);
        setRoadToDestination(road2);
      }
    });

    return () => {
      active = false;
    };
  }, [booking.id, driverLat, driverLng]);

  // Determine active route stage
  const isHeadingToPickup = tripState === 'assigned' || tripState === 'arrived';
  const activeFocusPoints = isHeadingToPickup
    ? [currentDriverCoords, passengerPickupCoords]
    : [passengerPickupCoords, destinationDropCoords];

  return (
    <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800">
      
      {/* Top Floating Stage Indicator */}
      <div className="absolute top-3 left-3 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full px-3.5 py-1.5 text-[11px] font-black shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
        {isHeadingToPickup ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A3FF] animate-pulse"></span>
            <span className="text-[#003f87] dark:text-[#00A3FF]">1. Sunduin ang Pasahero</span>
          </>
        ) : (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-pulse"></span>
            <span className="text-[#FF6B00]">2. Patungong Destinasyon</span>
          </>
        )}
      </div>

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

        <AutoFitActiveRoute points={activeFocusPoints} tripState={tripState} />

        {isHeadingToPickup ? (
          <>
            {/* 1. Road from Driver to Passenger */}
            <Polyline
              positions={roadToPickup}
              pathOptions={{
                color: '#00A3FF',
                weight: 6,
                opacity: 0.9,
                dashArray: '8, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Driver Tricycle Marker */}
            <Marker position={currentDriverCoords} icon={createDriverTricycleIcon()} />

            {/* Passenger Pickup Location Marker */}
            <Marker position={passengerPickupCoords} icon={createPassengerPickupIcon()} />
          </>
        ) : (
          <>
            {/* 2. Road from Passenger to Drop-off Destination */}
            <Polyline
              positions={roadToDestination}
              pathOptions={{
                color: '#FF6B00',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Moving Driver / Passenger Pickup Marker */}
            <Marker position={passengerPickupCoords} icon={createDriverTricycleIcon()} />

            {/* Drop-off Destination Marker */}
            <Marker position={destinationDropCoords} icon={createDestinationIcon()} />
          </>
        )}
      </MapContainer>
    </div>
  );
};
