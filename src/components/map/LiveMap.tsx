import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Terminal, LocationFare } from '../../types/database.types';
import { getLocationIconEmoji } from '../../services/fareService';

// Custom SVG Icons
const createTricycleIcon = () => {
  return L.divIcon({
    className: 'custom-moped-pin',
    html: `
      <div style="background-color: #fcd400; color: #705d00; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2.5px solid #ffffff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createTerminalIcon = () => {
  return L.divIcon({
    className: 'custom-terminal-pin',
    html: `
      <div style="background-color: #00346F; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,52,111,0.35); border: 2.5px solid #00C1FD;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    className: 'custom-pickup-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; background-color: rgba(0, 193, 253, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: #00346F; color: #00C1FD; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,52,111,0.4); border: 2.5px solid #ffffff; z-index: 2;">
          <div style="width: 8px; height: 8px; background-color: #00C1FD; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -12],
  });
};

const createDestIcon = () => {
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; background-color: rgba(220, 38, 38, 0.3); border-radius: 50%; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: #dc2626; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(220,38,38,0.45); border: 2.5px solid #ffffff; z-index: 2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

const createLocationFareIcon = (loc: LocationFare, isSelected: boolean) => {
  const emoji = getLocationIconEmoji(loc.icon, loc.location_name);
  return L.divIcon({
    className: 'custom-location-fare-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
        <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: ${isSelected ? '#00346F' : '#ffffff'}; border: 2.5px solid ${isSelected ? '#00C1FD' : '#00346F'}; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.22); font-size: 16px; transition: transform 0.2s;">
          ${emoji}
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${isSelected ? '#00C1FD' : '#00346F'}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [34, 40],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  });
};

// Helper to check if coordinate is in Bauang vicinity
const isBauangVicinity = (lat: number, lng: number) => lat >= 16.40 && lat <= 16.65 && lng >= 120.25 && lng <= 120.45;

const createAssignedDriverIcon = (bodyNumber?: string) => {
  return L.divIcon({
    className: 'custom-assigned-driver-pin',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #00A3FF; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 38px; height: 38px; border-radius: 9999px; background-color: #00346F; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,52,111,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C1FD" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
        ${bodyNumber ? `<span style="position: absolute; bottom: -8px; background: #00346F; color: #00C1FD; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 4px; border: 1px solid #ffffff; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">#${bodyNumber}</span>` : ''}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Safe Auto-Fit Route Camera Bounds for Passenger View (Fits both driver and pickup)
const AutoFitPassengerBounds: React.FC<{ 
  points: [number, number][]; 
  triggerKey: string | number; 
}> = ({ points, triggerKey }) => {
  const map = useMap();
  useEffect(() => {
    let timer: any;
    if (!map || !(map as any)._mapPane) return;

    timer = setTimeout(() => {
      try {
        if (!map || !(map as any)._mapPane) return;
        if (points && points.length >= 2) {
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, {
            paddingTopLeft: [70, 40],
            paddingBottomRight: [180, 40],
            maxZoom: 16,
            animate: true,
          });
        }
      } catch {}
    }, 60);

    return () => {
      clearTimeout(timer);
    };
  }, [map, triggerKey, points[0]?.[0], points[0]?.[1], points[1]?.[0], points[1]?.[1]]);
  return null;
};

interface LiveMapProps {
  originLat: number;
  originLng: number;
  destLat?: number;
  destLng?: number;
  terminals: Terminal[];
  locationFares?: LocationFare[];
  selectedLocationFare?: LocationFare | null;
  onSelectMapLocation?: (lat: number, lng: number) => void;
  onSelectTerminal?: (terminal: Terminal) => void;
  onSelectLocationFare?: (loc: LocationFare) => void;
  onRouteDistanceCalculated?: (distanceKm: number) => void;
  activeDrivers?: Array<{ id: string; lat: number; lng: number; bodyNumber?: string }>;
  assignedDriver?: {
    id?: string;
    current_lat?: number;
    current_lng?: number;
    body_number?: string;
    plate_number?: string;
    profile?: { full_name?: string; phone_number?: string };
  } | null;
  bookingStatus?: string;
}

const MapClickHandler: React.FC<{ onSelect: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapFocusDestination: React.FC<{
  destLat?: number;
  destLng?: number;
  disabled?: boolean;
}> = ({ destLat, destLng, disabled }) => {
  const map = useMap();
  useEffect(() => {
    if (destLat && destLng && !disabled) {
      map.flyTo([destLat, destLng], 14, { duration: 1.2 });
    }
  }, [destLat, destLng, disabled, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  originLat,
  originLng,
  destLat,
  destLng,
  terminals,
  locationFares = [],
  selectedLocationFare,
  onSelectMapLocation,
  onSelectTerminal,
  onSelectLocationFare,
  onRouteDistanceCalculated,
  activeDrivers = [],
  assignedDriver,
  bookingStatus = 'idle',
}) => {
  const defaultCenter: [number, number] = [destLat || originLat || 16.5333, destLng || originLng || 120.3333];
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>([]);
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<[number, number][]>([]);

  // Assigned driver coordinates
  const rawAssignedLat = Number(assignedDriver?.current_lat) || 16.5333;
  const rawAssignedLng = Number(assignedDriver?.current_lng) || 120.3333;
  const assignedDriverCoords: [number, number] = [
    isBauangVicinity(rawAssignedLat, rawAssignedLng) ? rawAssignedLat : 16.5333,
    isBauangVicinity(rawAssignedLat, rawAssignedLng) ? rawAssignedLng : 120.3333,
  ];

  const hasAssignedDriver = !!assignedDriver && (bookingStatus === 'assigned' || bookingStatus === 'arrived' || bookingStatus === 'in_transit');

  // Fetch actual passenger route (Pickup -> Drop-off)
  useEffect(() => {
    if (!originLat || !originLng || !destLat || !destLng) {
      setRoadRouteCoords([]);
      return;
    }

    let isCancelled = false;

    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Route fetch failed');
        const data = await res.json();

        if (data.routes && data.routes.length > 0 && !isCancelled) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setRoadRouteCoords(coords);

          if (onRouteDistanceCalculated && data.routes[0].distance) {
            const distanceKm = Math.max(0.5, Math.round((data.routes[0].distance / 1000) * 10) / 10);
            onRouteDistanceCalculated(distanceKm);
          }
        }
      } catch {
        if (!isCancelled) {
          setRoadRouteCoords([
            [originLat, originLng],
            [destLat, destLng]
          ]);
        }
      }
    };

    fetchRoadRoute();

    return () => {
      isCancelled = true;
    };
  }, [originLat, originLng, destLat, destLng, onRouteDistanceCalculated]);

  // Fetch Driver -> Client Pickup Route when driver is assigned
  useEffect(() => {
    if (!hasAssignedDriver || !originLat || !originLng) {
      setDriverToPickupRoute([]);
      return;
    }

    let isCancelled = false;

    const fetchDriverRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${assignedDriverCoords[1]},${assignedDriverCoords[0]};${originLng},${originLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Driver route fetch failed');
        const data = await res.json();

        if (data.routes && data.routes.length > 0 && !isCancelled) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setDriverToPickupRoute(coords);
        }
      } catch {
        if (!isCancelled) {
          setDriverToPickupRoute([
            assignedDriverCoords,
            [originLat, originLng]
          ]);
        }
      }
    };

    fetchDriverRoute();

    return () => {
      isCancelled = true;
    };
  }, [hasAssignedDriver, assignedDriverCoords[0], assignedDriverCoords[1], originLat, originLng, bookingStatus]);

  const passengerFocusPoints: [number, number][] = hasAssignedDriver
    ? [assignedDriverCoords, [originLat, originLng]]
    : destLat && destLng
    ? [[originLat, originLng], [destLat, destLng]]
    : [[originLat, originLng]];

  return (
    <div className="relative w-full h-full min-h-[280px] overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* OpenStreetMap Base Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onSelectMapLocation && <MapClickHandler onSelect={onSelectMapLocation} />}
        <MapFocusDestination destLat={destLat} destLng={destLng} disabled={hasAssignedDriver} />
        <AutoFitPassengerBounds points={passengerFocusPoints} triggerKey={`${bookingStatus}-${hasAssignedDriver}`} />

        {/* Current Location / Pickup Marker */}
        <Marker position={[originLat, originLng]} icon={createPickupIcon()}>
          <Popup>
            <div className="text-xs font-bold text-primary p-1 text-center">
              📍 Kasalukuyang Lokasyon<br />
              <span className="text-[10px] text-slate-500 font-normal">Saan ka sasakay (Pickup Point)</span>
            </div>
          </Popup>
        </Marker>

        {/* Assigned Driver Marker (When Trip Active) */}
        {hasAssignedDriver && (
          <Marker position={assignedDriverCoords} icon={createAssignedDriverIcon(assignedDriver?.body_number)}>
            <Popup>
              <div className="text-xs font-bold text-[#00346F] p-1 text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[#00A3FF]">
                  <span className="w-2 h-2 rounded-full bg-[#00A3FF] animate-ping"></span>
                  <span className="font-extrabold">Papunta na si Manong Driver!</span>
                </div>
                <div className="text-slate-800 font-bold">{assignedDriver?.profile?.full_name || 'Juan Dela Cruz'}</div>
                <div className="text-[10px] text-slate-500">
                  Body #{assignedDriver?.body_number || '0142'} • Plate: {assignedDriver?.plate_number || '1234-AB'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Pin (Red Target) */}
        {destLat && destLng && (
          <Marker position={[destLat, destLng]} icon={createDestIcon()}>
            <Popup>
              <div className="text-xs font-bold text-error p-1 text-center">
                🎯 Pupuntahang Destinasyon<br />
                <span className="text-[10px] text-slate-500 font-normal">
                  {selectedLocationFare ? `Sona: ${selectedLocationFare.location_name}` : 'Drop-off Pin'}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ═══════════ LEG 1: Driver to Client Pickup Road Path (Cyan Dashed) ═══════════ */}
        {hasAssignedDriver && driverToPickupRoute.length > 0 && (
          <>
            <Polyline
              positions={driverToPickupRoute}
              pathOptions={{
                color: '#ffffff',
                weight: 8,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={driverToPickupRoute}
              pathOptions={{
                color: '#00A3FF',
                weight: 5.5,
                opacity: 1,
                dashArray: '10, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* ═══════════ LEG 2: Passenger Pickup to Destination Route (Navy / Orange) ═══════════ */}
        {roadRouteCoords.length > 0 && (
          <>
            <Polyline
              positions={roadRouteCoords}
              pathOptions={{
                color: '#00346F',
                weight: 6,
                opacity: hasAssignedDriver ? 0.6 : 0.9,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
            <Polyline
              positions={roadRouteCoords}
              pathOptions={{
                color: hasAssignedDriver ? '#FF6B00' : '#00C1FD',
                weight: 2.5,
                opacity: 0.85,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </>
        )}

        {/* TODA Terminal Markers */}
        {terminals.map((term) => (
          <Marker
            key={term.id}
            position={[term.lat, term.lng]}
            icon={createTerminalIcon()}
            eventHandlers={{
              click: () => {
                if (onSelectTerminal) onSelectTerminal(term);
              }
            }}
          >
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <div className="font-extrabold text-[#00346F]">{term.name}</div>
                <div className="text-[11px] text-slate-600">TODA Code: <strong>{term.code}</strong></div>
                <div className="text-[10px] text-sky-600 font-bold mt-1">👉 Click to set as Origin Terminal</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Destination Location Pricing Markers */}
        {locationFares.map((loc) => {
          const isSelected = selectedLocationFare?.id === loc.id;
          return (
            <Marker
              key={`loc-pin-${loc.id}-${loc.icon || 'pin'}-${loc.lat}-${loc.lng}-${isSelected ? 'sel' : 'unsel'}`}
              position={[loc.lat, loc.lng]}
              icon={createLocationFareIcon(loc, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectLocationFare) onSelectLocationFare(loc);
                }
              }}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1">
                  <div className="font-bold text-[#00346F]">{loc.location_name}</div>
                  <div className="text-[11px] text-slate-600">
                    Regulated Fare: <strong className="text-emerald-700 font-extrabold">₱{Number(loc.standard_fare).toFixed(2)}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {loc.notes || 'Official LGU Tariff Zone'}
                  </div>
                  <button
                    onClick={() => {
                      if (onSelectLocationFare) onSelectLocationFare(loc);
                    }}
                    className="w-full mt-1.5 py-1 px-2 bg-[#00346F] text-white rounded text-[10px] font-bold"
                  >
                    Select this Destination
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Tricycles Live Markers */}
        {activeDrivers.map((driver) => (
          <Marker
            key={driver.id}
            position={[driver.lat, driver.lng]}
            icon={createTricycleIcon()}
          >
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-secondary">Tricycle #{driver.bodyNumber || '104'}</div>
                <div className="text-[10px] text-emerald-600 font-semibold">Available for Ride</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
