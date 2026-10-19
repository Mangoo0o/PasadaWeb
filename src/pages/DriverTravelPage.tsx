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
  AlertTriangle,
  LocateFixed,
  MessageSquare,
  Play,
  Square,
  Repeat,
  Search,
  Check,
  Compass
} from 'lucide-react';
import { Booking, LocationFare } from '../types/database.types';
import { updateBookingStatus, subscribeToBooking, extendBookingDestination } from '../services/bookingService';
import { useAuth } from '../hooks/useAuth';
import { broadcastDriverLocation } from '../services/driverTrackingService';
import { soundService } from '../services/soundNotificationService';
import { InTripChatModal } from '../components/booking/InTripChatModal';
import { InPhoneMessageBanner } from '../components/booking/InPhoneMessageBanner';
import { subscribeToTripChat, fetchTripMessages } from '../services/tripChatService';
import { useTranslation } from 'react-i18next';
import { 
  getPassengerTypeInfo, 
  isDiscountEligibleType, 
  calculateTripCompletionFare, 
  TripCompletionCalculation,
  fetchLocationFares,
  calculateFare
} from '../services/fareService';

interface DriverTravelPageProps {
  booking: Booking;
  driverLat?: number;
  driverLng?: number;
  onExitTravel: () => void;
}

// Vehicle Marker Icon (Bauang Tricycle with high-visibility badge)
const createDriverTricycleIcon = () => {
  return L.divIcon({
    className: 'custom-driver-vehicle-pin',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #fcd400; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 38px; height: 38px; border-radius: 9999px; background-color: #fcd400; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #705d00;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

// Pickup Location Icon (Cyan Target Pin)
const createPassengerPickupIcon = () => {
  return L.divIcon({
    className: 'custom-driver-pickup-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 40px; height: 40px; background-color: rgba(0, 163, 255, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: #00A3FF; color: #ffffff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,163,255,0.45); border: 2.5px solid #ffffff; z-index: 2;">
          <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Destination Location Icon (Orange Target Pin)
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

// Helper to validate geographic coordinates (non-null, non-zero, within valid global boundaries)
const isValidCoord = (lat?: number | null, lng?: number | null): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// Safe Auto-Fit Route Camera Bounds (Fits both driver and destination/pickup in view)
const AutoFitRoute: React.FC<{ 
  points: [number, number][]; 
  triggerKey: number; 
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
            paddingTopLeft: [100, 40],
            paddingBottomRight: [160, 40],
            maxZoom: 16,
            animate: true,
          });
        } else if (points && points.length === 1) {
          map.setView(points[0], 15.5, { animate: true });
        }
      } catch {}
    }, 60);

    return () => {
      clearTimeout(timer);
    };
  }, [map, triggerKey, points[0]?.[0], points[0]?.[1], points[1]?.[0], points[1]?.[1]]);
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
  const { t, i18n } = useTranslation();
  const { user, driverProfile } = useAuth();
  const activeDriverId = driverProfile?.id || booking.driver_id || user?.id;

  // 1. Initial coordinates with safe fallback
  const rawDriverLat = Number(driverLat);
  const rawDriverLng = Number(driverLng);
  const initialDriverLat = isValidCoord(rawDriverLat, rawDriverLng) ? rawDriverLat : 16.5333;
  const initialDriverLng = isValidCoord(rawDriverLat, rawDriverLng) ? rawDriverLng : 120.3333;
  const [driverCoords, setDriverCoords] = useState<[number, number]>([initialDriverLat, initialDriverLng]);

  const rawOriginLat = Number(booking.origin_lat);
  const rawOriginLng = Number(booking.origin_lng);
  const passengerPickupCoords: [number, number] = [
    isValidCoord(rawOriginLat, rawOriginLng) ? rawOriginLat : 16.5310,
    isValidCoord(rawOriginLat, rawOriginLng) ? rawOriginLng : 120.3320,
  ];

  const [currentBooking, setCurrentBooking] = useState<Booking>(booking);
  const currentBookingRef = React.useRef<Booking>(booking);
  useEffect(() => {
    currentBookingRef.current = currentBooking;
  }, [currentBooking]);

  const rawDestLat = Number(currentBooking.destination_lat || booking.destination_lat);
  const rawDestLng = Number(currentBooking.destination_lng || booking.destination_lng);
  const initialDestCoords: [number, number] = [
    isValidCoord(rawDestLat, rawDestLng) ? rawDestLat : 16.5385,
    isValidCoord(rawDestLat, rawDestLng) ? rawDestLng : 120.3250,
  ];
  const [destinationCoords, setDestinationCoords] = useState<[number, number]>(initialDestCoords);

  // Real-time banner alert when passenger extends destination
  const [rebookAlert, setRebookAlert] = useState<{
    show: boolean;
    newDestination: string;
    addedFare: number;
    totalFare: number;
  } | null>(null);

  // Driver-side Rebook state (if commuter requests destination extension verbally)
  const [showDriverRebookModal, setShowDriverRebookModal] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<LocationFare[]>([]);
  const [driverRebookSearch, setDriverRebookSearch] = useState('');
  const [selectedNewLocation, setSelectedNewLocation] = useState<LocationFare | null>(null);
  const [isSubmittingDriverRebook, setIsSubmittingDriverRebook] = useState(false);

  // Fetch official TODA location fares for driver rebook selection
  useEffect(() => {
    fetchLocationFares().then((locs) => {
      if (locs && locs.length > 0) {
        setAvailableLocations(locs);
      }
    });
  }, []);

  // Simulation mode state for testing / demo without driving
  const [isSimulating, setIsSimulating] = useState(false);
  const simStepRef = React.useRef(0);

  // Real-time live GPS tracking for driver movement
  useEffect(() => {
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (isValidCoord(lat, lng)) {
            // Only update from hardware GPS if simulation is not currently running
            if (!isSimulating) {
              setDriverCoords([lat, lng]);
              if (activeDriverId) {
                broadcastDriverLocation(activeDriverId, {
                  lat,
                  lng,
                  heading: pos.coords.heading,
                  speed: pos.coords.speed
                });
              }
            }
          }
        },
        (err) => console.warn('Driver GPS watch error:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }
    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeDriverId, isSimulating]);

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
    destinationCoords,
  ]);

  const [completedFare, setCompletedFare] = useState<number | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [additionalFareInput, setAdditionalFareInput] = useState<string>('0');
  const [additionalFareReason, setAdditionalFareReason] = useState<string>('');
  const [completedBreakdown, setCompletedBreakdown] = useState<TripCompletionCalculation | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [focusKey, setFocusKey] = useState<number>(0);

  const [passengerCancelledNotice, setPassengerCancelledNotice] = useState<{
    show: boolean;
    passengerName: string;
    originName: string;
    destinationName: string;
    fare: number;
  } | null>(null);

  // Commuter discount profile and base tariff resolution (reflects accumulated fare if rebooked)
  const rawPassengerType = currentBooking.passenger?.passenger_type || (currentBooking as any)?.passenger_type || 'regular';
  const isEligibleDiscount = isDiscountEligibleType(rawPassengerType);
  const pTypeInfo = getPassengerTypeInfo(rawPassengerType);

  // Check if trip was rebooked/extended
  const isRebooked = Boolean(
    (currentBooking.rebook_count != null && Number(currentBooking.rebook_count) > 0) ||
    (currentBooking.original_destination_name && currentBooking.original_destination_name !== currentBooking.destination_name) ||
    (currentBooking.extension_fare != null && Number(currentBooking.extension_fare) > 0)
  );

  // Original standard tariff before discount (reflects accumulated fare if rebooked)
  const baseTariff = Number(
    currentBooking.base_fare || (isEligibleDiscount && currentBooking.estimated_fare === 16 ? 20 : currentBooking.estimated_fare)
  );

  const parsedAdditionalFare = Math.max(0, Number(additionalFareInput) || 0);
  const currentSettlementCalc = calculateTripCompletionFare(baseTariff, parsedAdditionalFare, isEligibleDiscount);

  // Subscribe to real-time booking updates (e.g. passenger cancels, rebooks or extends destination)
  useEffect(() => {
    if (!booking?.id) return;

    const handleBookingUpdate = (latest: Booking) => {
      if (!latest) return;
      const prev = currentBookingRef.current;

      // Detect if passenger cancelled the trip
      if (latest.status === 'cancelled') {
        const passName =
          latest.passenger?.full_name ||
          latest.passenger_name ||
          prev.passenger?.full_name ||
          prev.passenger_name ||
          'Pasahero';

        soundService.playTripCancelledAlert({
          passengerName: passName,
          pickupName: latest.origin_name || prev.origin_name,
        });

        setPassengerCancelledNotice({
          show: true,
          passengerName: passName,
          originName: latest.origin_name || prev.origin_name || 'Pickup Point',
          destinationName: latest.destination_name || prev.destination_name || 'Destination',
          fare: Number(latest.estimated_fare || prev.estimated_fare || 0),
        });
        return;
      }

      const destNameChanged =
        Boolean(latest.destination_name && latest.destination_name !== prev.destination_name);
      const destCoordsChanged =
        (latest.destination_lat && Number(latest.destination_lat) !== Number(prev.destination_lat)) ||
        (latest.destination_lng && Number(latest.destination_lng) !== Number(prev.destination_lng));
      const fareChanged =
        latest.estimated_fare != null && Number(latest.estimated_fare) !== Number(prev.estimated_fare);
      const rebookCountIncreased =
        Number(latest.rebook_count || 0) > Number(prev.rebook_count || 0);

      const isRebookDetected = destNameChanged || destCoordsChanged || fareChanged || rebookCountIncreased;

      if (isRebookDetected) {
        const newLat = Number(latest.destination_lat);
        const newLng = Number(latest.destination_lng);
        if (isValidCoord(newLat, newLng)) {
          setDestinationCoords([newLat, newLng]);
        }

        // Trigger audio chime alert for driver
        soundService.playDispatchAlert();

        // Refocus camera bounds to fit new route
        setFocusKey((k) => k + 1);

        const added = latest.extension_fare != null && Number(latest.extension_fare) > 0
          ? Number(latest.extension_fare)
          : Math.max(0, Number(latest.estimated_fare) - Number(prev.estimated_fare || latest.original_fare || 0));

        setRebookAlert({
          show: true,
          newDestination: latest.destination_name || 'Bagong Destinasyon',
          addedFare: added,
          totalFare: Number(latest.estimated_fare),
        });
      }

      setCurrentBooking((current) => ({ ...current, ...latest }));
    };

    const unsubscribe = subscribeToBooking(booking.id, handleBookingUpdate);

    return () => {
      unsubscribe();
    };
  }, [booking.id]);

  // Immediate listener for window cancellation events
  useEffect(() => {
    if (!booking?.id) return;

    const handleCancelledEvent = (e: any) => {
      const detail = e?.detail;
      if (detail && (detail.id === booking.id || detail.bookingId === booking.id)) {
        if (detail.status === 'cancelled') {
          const passName =
            detail.updatedBooking?.passenger?.full_name ||
            detail.updatedBooking?.passenger_name ||
            currentBookingRef.current.passenger?.full_name ||
            currentBookingRef.current.passenger_name ||
            'Pasahero';

          soundService.playTripCancelledAlert({
            passengerName: passName,
            pickupName: currentBookingRef.current.origin_name,
          });

          setPassengerCancelledNotice({
            show: true,
            passengerName: passName,
            originName: currentBookingRef.current.origin_name || 'Pickup Point',
            destinationName: currentBookingRef.current.destination_name || 'Destination',
            fare: Number(currentBookingRef.current.estimated_fare || 0),
          });
        }
      }
    };

    window.addEventListener('pasada_booking_updated', handleCancelledEvent);
    return () => window.removeEventListener('pasada_booking_updated', handleCancelledEvent);
  }, [booking.id]);

  // Driver submits destination rebook / extension (e.g. verbally requested by commuter)
  const handleConfirmDriverRebook = async () => {
    if (!selectedNewLocation || !booking?.id) return;
    setIsSubmittingDriverRebook(true);

    try {
      const calc = calculateFare(
        Number(selectedNewLocation.standard_fare || 20),
        isEligibleDiscount,
        selectedNewLocation.discounted_fare
      );
      const extensionFare = calc.finalFare;

      const res = await extendBookingDestination({
        bookingId: booking.id,
        newDestinationName: selectedNewLocation.location_name,
        newDestinationLat: selectedNewLocation.lat,
        newDestinationLng: selectedNewLocation.lng,
        extensionFare: extensionFare,
        passengerId: currentBooking.passenger_id || booking.passenger_id,
        passengerName: currentBooking.passenger?.full_name || 'Passenger'
      });

      if (res.success && res.updatedBooking) {
        setCurrentBooking(res.updatedBooking);
        setDestinationCoords([selectedNewLocation.lat, selectedNewLocation.lng]);
        setFocusKey((k) => k + 1);
        setShowDriverRebookModal(false);
        setSelectedNewLocation(null);
        setDriverRebookSearch('');
        soundService.playTripCompletedAlert();
        setRebookAlert({
          show: true,
          newDestination: selectedNewLocation.location_name,
          addedFare: extensionFare,
          totalFare: Number(res.updatedBooking.estimated_fare),
        });
      } else {
        alert(res.error || 'Failed to extend destination');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating destination');
    } finally {
      setIsSubmittingDriverRebook(false);
    }
  };

  useEffect(() => {
    if (!booking?.id) return;
    // Pre-fetch messages into cache
    fetchTripMessages(booking.id);

    const unsubscribe = subscribeToTripChat(booking.id, (newMsg) => {
      const isFromOther = newMsg.senderRole
        ? newMsg.senderRole !== 'driver'
        : newMsg.senderId !== (activeDriverId || 'driver');

      if (isFromOther && !showChatModal) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });
    return () => unsubscribe();
  }, [booking?.id, activeDriverId, showChatModal]);

  // Trigger camera auto-focus once when phase changes
  useEffect(() => {
    setFocusKey((k) => k + 1);
  }, [tripState]);

  const handleRecenterMap = () => {
    setFocusKey((k) => k + 1);
  };

  // Reset simulation step when trip phase changes
  useEffect(() => {
    simStepRef.current = 0;
  }, [tripState]);

  // Movement simulation effect: steps along the active road polyline
  useEffect(() => {
    if (!isSimulating) return;

    const isHeadingToPickup = tripState === 'assigned' || tripState === 'arrived';
    const activeRoad = isHeadingToPickup ? roadToPickup : roadToDestination;

    if (!activeRoad || activeRoad.length < 2) return;

    const interval = setInterval(() => {
      simStepRef.current += 1;
      if (simStepRef.current >= activeRoad.length) {
        simStepRef.current = activeRoad.length - 1;
        setIsSimulating(false); // Reached destination
      }

      const nextCoord = activeRoad[simStepRef.current];
      if (nextCoord && isValidCoord(nextCoord[0], nextCoord[1])) {
        setDriverCoords(nextCoord);
        if (activeDriverId) {
          broadcastDriverLocation(activeDriverId, {
            lat: nextCoord[0],
            lng: nextCoord[1],
            heading: 45,
            speed: 28
          }, true);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isSimulating, tripState, roadToPickup, roadToDestination, activeDriverId]);

  // Dynamically update road polyline matching the active phase & destination coordinates
  useEffect(() => {
    let active = true;

    if (tripState === 'assigned' || tripState === 'arrived') {
      // Phase 1: Route to Passenger Pickup
      fetchOSRMRoute(driverCoords, passengerPickupCoords).then((road) => {
        if (active) setRoadToPickup(road);
      });
      fetchOSRMRoute(passengerPickupCoords, destinationCoords).then((road) => {
        if (active) setRoadToDestination(road);
      });
    } else if (tripState === 'in_transit') {
      // Phase 2: Route from Current Location to Destination
      fetchOSRMRoute(driverCoords, destinationCoords).then((road) => {
        if (active) setRoadToDestination(road);
      });
    }

    return () => {
      active = false;
    };
  }, [tripState, booking.id, driverCoords[0], driverCoords[1], destinationCoords[0], destinationCoords[1]]);

  // Stage Action Handlers
  const handleArrivePickup = async () => {
    setTripState('arrived');
    await updateBookingStatus(booking.id, 'driver_arrived', activeDriverId);
  };

  const handleStartTrip = async () => {
    setTripState('in_transit');
    await updateBookingStatus(booking.id, 'in_transit', activeDriverId);
  };

  const handleOpenSettlement = () => {
    setShowSettlementModal(true);
  };

  const handleConfirmFinalCompletion = async () => {
    const calc = currentSettlementCalc;
    setTripState('completed');
    setCompletedFare(calc.finalPayableFare);
    setCompletedBreakdown(calc);
    soundService.playTripCompletedAlert();
    setShowSettlementModal(false);
    await updateBookingStatus(
      booking.id,
      'completed',
      activeDriverId,
      calc.finalPayableFare,
      calc.additionalFare,
      additionalFareReason.trim() || (calc.additionalFare > 0 ? 'Manual Surcharge' : undefined),
      calc.discountAmount,
      calc.baseFare
    );
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
    : [driverCoords, destinationCoords];

  return (
    <div className="fixed inset-0 z-[9999] w-full h-full bg-slate-950 flex flex-col overflow-hidden font-sans">
      
      {/* 1. TOP DUAL-LOCATION HUD BAR */}
      <div 
        style={{
          position: 'absolute',
          top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))',
          left: '10px',
          right: '10px',
          zIndex: 10000
        }}
        className="max-w-2xl mx-auto pointer-events-auto sm:!top-4 sm:!left-4 sm:!right-4 space-y-2"
      >
        {/* Real-time Rebook / Destination Extension Alert Banner */}
        {rebookAlert?.show && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-2.5 sm:p-3.5 rounded-2xl shadow-2xl border-2 border-white flex items-center justify-between gap-2.5 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <Repeat className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-black tracking-wider text-slate-900 flex items-center gap-1">
                  <span>🔔 Na-update ang Destinasyon!</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-950 truncate">
                  {rebookAlert.newDestination}
                </div>
                <div className="text-[10px] font-bold text-slate-900">
                  Dagdag: +₱{rebookAlert.addedFare.toFixed(2)} • Kabuuang Bayad: ₱{rebookAlert.totalFare.toFixed(2)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRebookAlert(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800 font-black text-[10px] sm:text-[11px] shadow-sm shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              Naintindihan
            </button>
          </div>
        )}

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 sm:space-y-2.5">
          
          {/* Header Row: Active Phase Badge + Phone Action + Fare */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 sm:pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isHeadingToPickup ? 'bg-[#00A3FF]' : 'bg-[#FF6B00]'} animate-pulse shrink-0`}></span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                {isHeadingToPickup ? `1. ${t('driver.pickupStage', 'Sunduin sa Sakayan')}` : `2. ${t('driver.dropoffStage', 'Ihatid sa Destinasyon')}`}
              </span>
              {currentBooking.passenger?.full_name && (
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                  • {currentBooking.passenger.full_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowChatModal(true);
                  setUnreadChatCount(0);
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#0052d1] hover:bg-[#003f9e] text-white shadow-sm flex items-center justify-center transition-transform active:scale-95 cursor-pointer relative"
                title={t('driver.chatPassenger', 'Chat Passenger')}
              >
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white font-black text-[8px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadChatCount}
                  </span>
                )}
              </button>
              {currentBooking.passenger?.phone_number && (
                <a
                  href={`tel:${currentBooking.passenger.phone_number}`}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center transition-transform active:scale-95"
                  title={t('driver.callPassenger', 'Call Passenger')}
                >
                  <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </a>
              )}
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-[#003f87] dark:text-[#00C1FD] block">
                  ₱{Number(currentBooking.estimated_fare || booking.estimated_fare).toFixed(2)}
                </span>
                {isRebooked && (
                  <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 block leading-tight">
                    +₱{Number(currentBooking.extension_fare || (Number(currentBooking.estimated_fare) - Number(currentBooking.original_fare || 0))).toFixed(2)} Rebooked
                  </span>
                )}
                {isDiscountEligibleType(currentBooking.passenger?.passenger_type || (currentBooking as any)?.passenger_type) && (
                  <span className="text-[8px] sm:text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.2 rounded inline-block">
                    -20% {getPassengerTypeInfo(currentBooking.passenger?.passenger_type || (currentBooking as any)?.passenger_type).label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Location Stack Matching User Design */}
          <div className="space-y-0.5 sm:space-y-1 px-0.5">
            {/* SAKAYAN */}
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#00A3FF] shrink-0 mt-0.5 ${
                isHeadingToPickup ? 'ring-2 sm:ring-4 ring-[#00A3FF]/25 shadow-sm' : 'opacity-70'
              }`}></div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] sm:text-[9px] uppercase font-black text-[#00A3FF] block tracking-wider leading-none">
                  {t('driver.pickup', 'SAKAYAN')}
                </span>
                <span className={`text-[11px] sm:text-xs truncate block mt-0.5 ${
                  isHeadingToPickup ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}>
                  {currentBooking.origin_name || booking.origin_name}
                </span>
              </div>
            </div>

            {/* Connecting Vertical Line */}
            <div className="border-l border-dashed border-slate-300 dark:border-slate-600 ml-1 sm:ml-1.5 h-2 sm:h-2.5"></div>

            {/* BABAAN */}
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF6B00] shrink-0 mt-0.5 ${
                !isHeadingToPickup ? 'ring-2 sm:ring-4 ring-[#FF6B00]/25 shadow-sm' : 'opacity-70'
              }`}></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[8px] sm:text-[9px] uppercase font-black text-[#FF6B00] tracking-wider leading-none">
                    {t('driver.dropoff', 'BABAAN')}
                  </span>
                  {isRebooked && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm flex items-center gap-1 animate-pulse">
                      <Repeat className="w-2.5 h-2.5 shrink-0" />
                      <span>{t('driver.rebookedBadge', 'BAGONG DESTINASYON')}</span>
                    </span>
                  )}
                </div>
                <span className={`text-[11px] sm:text-xs truncate block mt-0.5 ${
                  !isHeadingToPickup ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}>
                  {currentBooking.destination_name || booking.destination_name}
                </span>
                {isRebooked && currentBooking.original_destination_name && currentBooking.original_destination_name !== (currentBooking.destination_name || booking.destination_name) && (
                  <span className="text-[9px] text-slate-400 line-through block truncate mt-0.5">
                    {t('driver.originalDestination', 'Dati')}: {currentBooking.original_destination_name}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. FULL-BLEED 100% ROAD MAP */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          center={isHeadingToPickup ? passengerPickupCoords : destinationCoords}
          zoom={15}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AutoFitRoute points={activeFocusPoints} triggerKey={focusKey} />

          {isHeadingToPickup ? (
            <>
              {/* Path 1: Driver to Passenger Pickup (High-contrast Cyan Dashed) */}
              <Polyline
                positions={roadToPickup}
                pathOptions={{
                  color: '#ffffff',
                  weight: 8,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={roadToPickup}
                pathOptions={{
                  color: '#00A3FF',
                  weight: 5.5,
                  opacity: 1,
                  dashArray: '10, 8',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Marker position={driverCoords} icon={createDriverTricycleIcon()} />
              <Marker position={passengerPickupCoords} icon={createPassengerPickupIcon()} />
            </>
          ) : (
            <>
              {/* Path 2: Driver to Drop-off Destination (High-contrast Orange Solid) */}
              <Polyline
                positions={roadToDestination}
                pathOptions={{
                  color: '#ffffff',
                  weight: 8,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={roadToDestination}
                pathOptions={{
                  color: '#FF6B00',
                  weight: 5.5,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Marker position={driverCoords} icon={createDriverTricycleIcon()} />
              <Marker position={destinationCoords} icon={createDestinationIcon()} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Floating Re-center & Simulation Controls */}
      <div className="absolute right-3 sm:right-4 bottom-28 sm:bottom-36 z-[10000] pointer-events-auto flex flex-col items-end gap-2">
        {/* Simulation Mode Toggle Button */}
        <button
          onClick={() => setIsSimulating((prev) => !prev)}
          className={`h-9 sm:h-10 px-3 rounded-xl sm:rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
            isSimulating
              ? 'bg-amber-500 text-white border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
              : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95'
          }`}
          title="Simulate vehicle moving along road (Demo/Testing)"
        >
          {isSimulating ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current text-white" />
              <span>Huminto (Stop)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>Simulate Ride</span>
            </>
          )}
        </button>

        <button
          onClick={handleRecenterMap}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200/90 dark:border-slate-800 text-[#003f87] dark:text-[#00C1FD] flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title={t('driver.recenterMap', 'Focus Map on Current Route')}
        >
          <LocateFixed className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-45 transition-transform" />
        </button>
      </div>

      {/* 3. BOTTOM FLOATING ACTION CONTROLS & STAGE STEPPER */}
      <div className="absolute bottom-4 sm:bottom-6 left-2.5 sm:left-4 right-2.5 sm:right-4 max-w-2xl mx-auto z-[10000] pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 sm:space-y-2.5">
          
          {/* Stage Progression Stepper with Checkmarks */}
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 sm:pb-2">
            {/* Stage 1: Sunduin sa Sakayan */}
            <div className={`flex items-center gap-1 sm:gap-1.5 font-black text-[9px] sm:text-[11px] ${
              tripState === 'assigned'
                ? 'text-[#00A3FF]'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {tripState === 'arrived' || tripState === 'in_transit' || tripState === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[#00A3FF] bg-[#00A3FF]/10 flex items-center justify-center text-[9px] sm:text-[10px] text-[#00A3FF] shrink-0 animate-pulse">
                  1
                </span>
              )}
              <span className="truncate">{t('driver.pickupStage', 'Sunduin sa Sakayan')}</span>
            </div>

            {/* Connecting Line */}
            <div className={`flex-1 h-0.5 mx-1.5 sm:mx-2 rounded-full ${
              tripState === 'in_transit' || tripState === 'completed'
                ? 'bg-emerald-500'
                : 'bg-slate-200 dark:bg-slate-700'
            }`} />

            {/* Stage 2: Ihatid sa Destinasyon */}
            <div className={`flex items-center gap-1 sm:gap-1.5 font-black text-[9px] sm:text-[11px] ${
              tripState === 'in_transit'
                ? 'text-[#FF6B00]'
                : tripState === 'completed'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}>
              {tripState === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : tripState === 'in_transit' ? (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[#FF6B00] bg-[#FF6B00]/10 flex items-center justify-center text-[9px] sm:text-[10px] text-[#FF6B00] shrink-0 animate-pulse">
                  2
                </span>
              ) : (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] sm:text-[10px] text-slate-400 shrink-0">
                  2
                </span>
              )}
              <span className="truncate">{t('driver.dropoffStage', 'Ihatid sa Destinasyon')}</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-0.5">
            {/* Cancel Button */}
            {tripState !== 'completed' && (
              <button
                onClick={handleOpenCancelModal}
                className="px-2.5 py-2.5 sm:px-3 sm:py-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] sm:text-xs border border-rose-200 transition-all active:scale-95 shrink-0 cursor-pointer flex items-center gap-1"
                title={t('driver.cancelTripBtn', 'I-cancel')}
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">{t('driver.cancelTripBtn', 'I-cancel')}</span>
              </button>
            )}

            {/* Driver Rebook Destination Button */}
            {tripState !== 'completed' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedNewLocation(null);
                  setDriverRebookSearch('');
                  setShowDriverRebookModal(true);
                }}
                className="px-2.5 py-2.5 sm:px-3.5 sm:py-3.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] sm:text-xs border border-amber-300 dark:border-amber-700 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer flex items-center gap-1.5"
                title="Palawigin o baguhin ang destinasyon (Rebook)"
              >
                <Repeat className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t('driver.rebookBtn', 'Rebook')}</span>
              </button>
            )}

            {/* Primary Action Button */}
            <div className="flex-1">
              {tripState === 'assigned' && (
                <button
                  onClick={handleArrivePickup}
                  className="w-full py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-[#003f87]/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C1FD]" />
                  <span>{t('driver.arrivedBtn', 'Nasa Sakayan Na')}</span>
                </button>
              )}

              {tripState === 'arrived' && (
                <button
                  onClick={handleStartTrip}
                  className="w-full py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  <span>{t('driver.startTripBtn', 'Simulan ang Byahe')}</span>
                </button>
              )}

              {tripState === 'in_transit' && (
                <button
                  onClick={handleOpenSettlement}
                  className="w-full py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-[#003f87]/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C1FD]" />
                  <span>{t('driver.completeTripBtn', 'Tapusin ang Byahe')}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 4. STEP 3: SETTLEMENT & OPTIONAL ADDITIONAL SURCHARGE MODAL */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003f87] text-[#00C1FD] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                    Pagtatapos ng Byahe
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    Kumpirmahin ang taripa at karagdagang singil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Base Tariff Notice */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Regulated Taripa {isRebooked ? '(May Rebook Extension)' : ''}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">
                    {currentBooking.destination_name || booking.destination_name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    ₱{currentSettlementCalc.baseFare.toFixed(2)}
                  </span>
                </div>
              </div>
              {isRebooked && (
                <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] space-y-0.5 text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>1. Dati / Unang Booking ({currentBooking.original_destination_name || 'Unang Destinasyon'}):</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">₱{Number(currentBooking.original_fare || 20).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold">
                    <span>2. Rebook Extension ({currentBooking.destination_name}):</span>
                    <span>+₱{Number(currentBooking.extension_fare || (Number(currentBooking.estimated_fare) - Number(currentBooking.original_fare || 20))).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Additional Surcharge Numeric Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>Karagdagang Singil (Opsyonal)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Dagdag pasahero / karga
                </span>
              </div>

              {/* Large Numeric Input */}
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-base font-black text-slate-400 pointer-events-none">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={additionalFareInput}
                  onChange={(e) => setAdditionalFareInput(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003f87] transition-all"
                />
                {Number(additionalFareInput) > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdditionalFareInput('0')}
                    className="absolute right-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Optional Reason Input if Additional Fare > 0 */}
              {Number(additionalFareInput) > 0 && (
                <input
                  type="text"
                  value={additionalFareReason}
                  onChange={(e) => setAdditionalFareReason(e.target.value)}
                  placeholder="Dahilan (Hal. +1 pasahero, mabigat na bagahi)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#003f87]"
                />
              )}
            </div>

            {/* Live Calculation Breakdown Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Base Taripa:</span>
                <span className="font-bold">₱{currentSettlementCalc.baseFare.toFixed(2)}</span>
              </div>

              {currentSettlementCalc.additionalFare > 0 && (
                <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
                  <span>Dagdag na Singil:</span>
                  <span>+₱{currentSettlementCalc.additionalFare.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-700 dark:text-slate-200 font-bold pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>Subtotal (Bago Diskwento):</span>
                <span>₱{currentSettlementCalc.subtotalGross.toFixed(2)}</span>
              </div>

              {currentSettlementCalc.isDiscounted && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-black">
                  <span>-20% Diskwento ({pTypeInfo.label}):</span>
                  <span>-₱{currentSettlementCalc.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-black uppercase text-slate-800 dark:text-white">
                  Kolektahing Pamasahe:
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₱{currentSettlementCalc.finalPayableFare.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Confirm Settlement Button */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmFinalCompletion}
                className="w-full py-3 sm:py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kumpirmahin at Tapusin (₱{currentSettlementCalc.finalPayableFare.toFixed(2)})</span>
              </button>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer text-center"
              >
                Bumalik sa Mapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TRIP COMPLETED SETTLEMENT MODAL */}
      {completedFare !== null && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {t('driver.tripCompletedTitle', 'Matagumpay na Naitawid!')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('driver.tripCompletedDesc', 'Naihatid nang maayos ang pasahero sa destinasyon.')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 block">
                {t('driver.collectFareCash', 'Singiling Pamasahe (Cash)')}
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₱{completedFare.toFixed(2)}
              </div>

              {/* Rebook Details on Completion Receipt */}
              {isRebooked && (
                <div className="p-2 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-[10px] text-amber-950 dark:text-amber-200 text-left space-y-0.5 border border-amber-300/60 dark:border-amber-700/60">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3 h-3 text-amber-600" />
                      <span>Rebooked Extension</span>
                    </span>
                    <span className="font-mono text-[9px] bg-amber-200 dark:bg-amber-800 px-1 rounded">{currentBooking.rebook_count ? `${currentBooking.rebook_count}x` : '1x'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>1. Dating Babaan ({currentBooking.original_destination_name || 'Unang Booking'}):</span>
                    <span className="font-semibold">₱{Number(currentBooking.original_fare || 20).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-800 dark:text-amber-300">
                    <span>2. Bagong Babaan ({currentBooking.destination_name}):</span>
                    <span>+₱{Number(currentBooking.extension_fare || (Number(currentBooking.estimated_fare) - Number(currentBooking.original_fare || 20))).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {completedBreakdown && (completedBreakdown.additionalFare > 0 || completedBreakdown.isDiscounted) && (
                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 text-[10px] text-emerald-900 dark:text-emerald-200 space-y-0.5 text-left font-medium">
                  <div className="flex justify-between">
                    <span>Base Taripa:</span>
                    <span>₱{completedBreakdown.baseFare.toFixed(2)}</span>
                  </div>
                  {completedBreakdown.additionalFare > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Karagdagang Singil:</span>
                      <span>+₱{completedBreakdown.additionalFare.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span>₱{completedBreakdown.subtotalGross.toFixed(2)}</span>
                  </div>
                  {completedBreakdown.isDiscounted && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                      <span>-20% Diskwento ({pTypeInfo.label}):</span>
                      <span>-₱{completedBreakdown.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onExitTravel}
              className="w-full py-3.5 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm shadow-md shadow-[#003f87]/20 active:scale-98 transition-all cursor-pointer"
            >
              {t('driver.backToTerminal', 'Return to Dashboard')}
            </button>
          </div>
        </div>
      )}

      {/* 5. PASSENGER CANCELLED NOTIFICATION MODAL */}
      {passengerCancelledNotice?.show && (
        <div className="fixed inset-0 z-[10200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-5 shadow-2xl border-2 border-rose-500/40 dark:border-rose-500/50 animate-in zoom-in-95">
            {/* Animated Warning Icon with Pulse */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg border-2 border-rose-300 dark:border-rose-700">
                <AlertCircle className="w-9 h-9" strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-black uppercase tracking-wider">
                <span>{t('driver.bookingCancelledBadge', 'Kanselado ang Booking')}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {t('driver.passengerCancelledTitle', 'Kinansela ng Pasahero ang Biyahe')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-1">
                {i18n.language === 'en'
                  ? `The passenger (${passengerCancelledNotice.passengerName}) has cancelled this booking. Your line is now available to accept new dispatches.`
                  : `Ipinagbigay-alam ng pasahero (${passengerCancelledNotice.passengerName}) na kinansela ang biyahe na ito. Bukas muli ang iyong linya para tumanggap ng bagong dispatch.`}
              </p>
            </div>

            {/* Trip Details Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 text-left border border-slate-200 dark:border-slate-700/70 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Pickup Point</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {passengerCancelledNotice.originName}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                <Navigation className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Destination</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {passengerCancelledNotice.destinationName}
                  </span>
                </div>
              </div>
            </div>

            {/* Dismiss / Return to Dispatch Button */}
            <button
              type="button"
              onClick={() => {
                setPassengerCancelledNotice(null);
                onExitTravel();
              }}
              className="w-full py-3.5 rounded-2xl bg-[#0052d1] hover:bg-[#003f87] text-white font-extrabold text-sm shadow-lg shadow-[#0052d1]/30 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('driver.understandReturn', 'Naintindihan / Bumalik sa Dispatch')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {t('driver.cancelModalTitle', 'Cancel this Trip?')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('driver.cancelModalDesc', 'Sigurado ka bang nais mong kanselahin ang biyahe na ito? Magiging bukas muli ang iyong linya sa ibang pasahero.')}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                disabled={isCancelling}
                onClick={handleConfirmCancelTrip}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? t('driver.cancelling', 'Kinakansela...') : t('driver.confirmCancel', 'Oo, Kanselahin')}
              </button>
              <button
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {t('driver.keepTrip', 'Huwag Kanselahin (Bumalik sa Biyahe)')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.5 DRIVER REBOOK / DESTINATION EXTENSION MODAL */}
      {showDriverRebookModal && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                    {t('driver.rebookModalTitle', 'Baguhin ang Destinasyon')}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    {t('driver.rebookModalSubtitle', 'Palawigin ang biyahe at i-update ang taripa')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDriverRebookModal(false);
                  setSelectedNewLocation(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Destination Card */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Kasalukuyang Babaan
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {currentBooking.destination_name || booking.destination_name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-[#003f87] dark:text-[#00C1FD]">
                  ₱{Number(currentBooking.estimated_fare || 20).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Search Input for Destinations */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={driverRebookSearch}
                onChange={(e) => setDriverRebookSearch(e.target.value)}
                placeholder="Maghanap ng bagong babaan..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003f87]"
              />
            </div>

            {/* Destination Selection List */}
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 min-h-[140px] max-h-[220px]">
              {availableLocations
                .filter((loc) =>
                  !driverRebookSearch.trim() ||
                  loc.location_name.toLowerCase().includes(driverRebookSearch.toLowerCase())
                )
                .slice(0, 20)
                .map((loc) => {
                  const isSelected = selectedNewLocation?.id === loc.id;
                  const isCurrent =
                    loc.location_name.toLowerCase() ===
                    (currentBooking.destination_name || '').toLowerCase();
                  const locFare = isEligibleDiscount
                    ? Number(loc.discounted_fare || loc.standard_fare || 20)
                    : Number(loc.standard_fare || 20);

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => setSelectedNewLocation(loc)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#003f87] bg-[#003f87]/10 dark:bg-[#003f87]/20 ring-1 ring-[#003f87]'
                          : isCurrent
                          ? 'border-slate-200 dark:border-slate-800 opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {loc.location_name} {isCurrent ? '(Kasalukuyan)' : ''}
                        </span>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          +₱{locFare.toFixed(2)}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#003f87] dark:text-[#00C1FD]" />}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Selected Destination Summary & Confirm */}
            {selectedNewLocation && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1 text-xs shrink-0">
                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>Bagong Babaan:</span>
                  <span className="text-[#FF6B00] font-black">{selectedNewLocation.location_name}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>Dagdag Taripa:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-black">
                    +₱{calculateFare(Number(selectedNewLocation.standard_fare || 20), isEligibleDiscount, selectedNewLocation.discounted_fare).finalFare.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1 border-t border-amber-200 dark:border-amber-800/60">
                  <span>Bagong Kabuuang Pamasahe:</span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    ₱{(
                      Number(currentBooking.estimated_fare || 20) +
                      calculateFare(Number(selectedNewLocation.standard_fare || 20), isEligibleDiscount, selectedNewLocation.discounted_fare).finalFare
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="space-y-1.5 pt-1 shrink-0">
              <button
                type="button"
                disabled={!selectedNewLocation || isSubmittingDriverRebook}
                onClick={handleConfirmDriverRebook}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmittingDriverRebook ? (
                  <span>Ina-update ang destinasyon...</span>
                ) : (
                  <>
                    <Repeat className="w-4 h-4" />
                    <span>Kumpirmahin ang Bagong Destinasyon</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowDriverRebookModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Kanselahin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. IN-TRIP CHAT MODAL */}
      <InTripChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        bookingId={booking.id}
        currentUserId={activeDriverId || 'driver'}
        currentUserRole="driver"
        currentUserName={driverProfile?.tricycle_model ? `Driver (${driverProfile.body_number || 'Tricycle'})` : 'Driver'}
        otherPartyName={currentBooking.passenger?.full_name || booking.passenger?.full_name || 'Pasahero'}
        otherPartySubtitle={`${currentBooking.origin_name || booking.origin_name} ➔ ${currentBooking.destination_name || booking.destination_name}`}
      />

      {/* 7. IN-PHONE MESSAGE NOTIFICATION BANNER (HEADS-UP TOAST) */}
      <InPhoneMessageBanner
        bookingId={booking.id}
        currentUserId={activeDriverId || 'driver'}
        currentUserRole="driver"
        isChatOpen={showChatModal}
        onOpenChat={() => {
          setShowChatModal(true);
          setUnreadChatCount(0);
        }}
      />

    </div>
  );
};

export default DriverTravelPage;
