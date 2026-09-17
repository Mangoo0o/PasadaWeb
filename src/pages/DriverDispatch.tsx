import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Power,
  LogOut,
  Sparkles,
  AlertCircle,
  Volume2,
  VolumeX,
  Globe
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Booking } from '../types/database.types';
import { fetchOpenDispatches, updateBookingStatus, subscribeToOpenDispatches, fetchActiveTrip } from '../services/bookingService';
import { soundService } from '../services/soundNotificationService';
import { BookingPreviewModal } from '../components/booking/BookingPreviewModal';
import { DriverActiveTripMap } from '../components/booking/DriverActiveTripMap';
import { DriverTravelPage } from './DriverTravelPage';
import { DriverVerificationGate } from '../components/driver/DriverVerificationGate';
import { getPassengerTypeInfo, isDiscountEligibleType } from '../services/fareService';
import { broadcastDriverLocation } from '../services/driverTrackingService';
import { getDistanceKm, formatProximityDistance, MAX_DISPATCH_RADIUS_KM } from '../services/geoProximityService';

export const DriverDispatch: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, driverProfile, toggleDriverAvailability, signOut, setLanguage } = useAuth();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setLanguage(nextLang);
  };

  const isOnline = driverProfile?.is_available ?? true;
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number }>({
    lat: Number(driverProfile?.current_lat) || 16.5333,
    lng: Number(driverProfile?.current_lng) || 120.3333
  });
  const [rawDispatches, setRawDispatches] = useState<Booking[]>([]);
  const [openDispatches, setOpenDispatches] = useState<Booking[]>([]);
  const [activeTrip, setActiveTrip] = useState<Booking | null>(null);
  const [tripState, setTripState] = useState<'idle' | 'assigned' | 'arrived' | 'in_transit' | 'completed'>('idle');
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  const [completedFare, setCompletedFare] = useState<number | null>(null);
  const [isSoundOn, setIsSoundOn] = useState(() => soundService.isSoundEnabled());
  const alertedDispatchIdsRef = useRef<Set<string>>(new Set());

  // 1. Continuous Live GPS tracking of driver & broadcast to Supabase/listeners
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDriverLocation({ lat, lng });
          if (driverProfile?.id) {
            broadcastDriverLocation(driverProfile.id, {
              lat,
              lng,
              heading: pos.coords.heading,
              speed: pos.coords.speed
            });
          }
        },
        (err) => console.warn('Driver GPS watch error:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [driverProfile?.id]);

  // Sync external/simulated location changes
  useEffect(() => {
    const handleLocUpdate = (e: any) => {
      const payload = e?.detail;
      if (payload?.lat && payload?.lng && (!driverProfile?.id || payload.driverId === driverProfile.id)) {
        setDriverLocation({ lat: payload.lat, lng: payload.lng });
      }
    };
    window.addEventListener('pasada_driver_location', handleLocUpdate);
    return () => window.removeEventListener('pasada_driver_location', handleLocUpdate);
  }, [driverProfile?.id]);

  // 2. Fetch raw dispatches from Supabase & active trip
  useEffect(() => {
    const loadDispatches = async () => {
      if (user?.id) {
        const existingActive = await fetchActiveTrip(user.id, true);
        if (existingActive) {
          setActiveTrip(existingActive);
          if (existingActive.status === 'driver_assigned') setTripState('assigned');
          else if (existingActive.status === 'driver_arrived') setTripState('arrived');
          else if (existingActive.status === 'in_transit') setTripState('in_transit');
        }
      }
      const dispatches = await fetchOpenDispatches();
      setRawDispatches(dispatches);
    };
    loadDispatches();

    const unsubscribe = subscribeToOpenDispatches((detail) => {
      if (!detail?.id) {
        loadDispatches();
        return;
      }

      // If booking was cancelled, accepted by another driver, or completed:
      if (detail.status && detail.status !== 'searching') {
        setRawDispatches(prev => prev.filter(b => b.id !== detail.id));
        setPreviewBooking(prev => prev?.id === detail.id ? null : prev);
        alertedDispatchIdsRef.current.delete(detail.id);
        try {
          const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
          const filtered = queue.filter((b: any) => b.id !== detail.id);
          localStorage.setItem('pasada_open_queue', JSON.stringify(filtered));
        } catch {}
        return;
      }

      // If new booking was requested or restored to searching:
      if (detail.status === 'searching') {
        loadDispatches();
      }
    });

    const interval = setInterval(loadDispatches, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  // 3. Dynamic 1.0 km Proximity & Late-Arrival Zone Entry Detection
  useEffect(() => {
    // Filter raw dispatches to strictly those within 1.0 km of driver's current position
    const within1Km = rawDispatches.filter((bk) => {
      if (!bk.origin_lat || !bk.origin_lng) return false;
      const dist = getDistanceKm(driverLocation.lat, driverLocation.lng, bk.origin_lat, bk.origin_lng);
      return dist <= MAX_DISPATCH_RADIUS_KM;
    });

    // Detect any dispatches entering the 1.0 km zone (new booking OR driver traveled into range)
    if (isOnline && !activeTrip) {
      const newlyEntered = within1Km.filter(d => !alertedDispatchIdsRef.current.has(d.id));
      if (newlyEntered.length > 0) {
        const newest = newlyEntered[0];
        soundService.playDispatchAlert({
          pickupName: newest.origin_name,
          fare: newest.estimated_fare
        });
        // Register newly entered dispatches so audio chimes only once per booking arrival
        newlyEntered.forEach(d => alertedDispatchIdsRef.current.add(d.id));
      }
    }

    setOpenDispatches(within1Km);
  }, [rawDispatches, driverLocation.lat, driverLocation.lng, isOnline, activeTrip]);

  // Auto-dismiss preview modal if booking was cancelled by passenger or taken by another driver
  useEffect(() => {
    if (previewBooking && openDispatches.length > 0 && !openDispatches.some(b => b.id === previewBooking.id)) {
      setPreviewBooking(null);
    }
  }, [openDispatches, previewBooking]);

  const handleAcceptBooking = async (booking: Booking) => {
    // Immediately remove accepted booking from raw and visible queues
    setRawDispatches(prev => prev.filter(b => b.id !== booking.id));
    setOpenDispatches(prev => prev.filter(b => b.id !== booking.id));
    setPreviewBooking(null);
    alertedDispatchIdsRef.current.delete(booking.id);
    try {
      const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
      const filtered = queue.filter((b: any) => b.id !== booking.id);
      localStorage.setItem('pasada_open_queue', JSON.stringify(filtered));
    } catch {}

    setActiveTrip(booking);
    setTripState('assigned');
    await updateBookingStatus(booking.id, 'driver_assigned', driverProfile?.id || user?.id);
  };

  const handleArrivePickup = async () => {
    setTripState('arrived');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'driver_arrived', driverProfile?.id || user?.id);
    }
  };

  const handleStartTrip = async () => {
    setTripState('in_transit');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'in_transit', driverProfile?.id || user?.id);
    }
  };

  const handleCompleteTrip = async () => {
    if (activeTrip) {
      const fare = activeTrip.estimated_fare;
      setTripState('completed');
      setCompletedFare(fare);
      await updateBookingStatus(activeTrip.id, 'completed', driverProfile?.id || user?.id, fare);
    }
  };

  const handleDismissCompleted = () => {
    setActiveTrip(null);
    setTripState('idle');
    setCompletedFare(null);
  };

  if (!user || user.role !== 'driver') {
    return null;
  }

  // Verification Gate: Drivers who are pending, rejected, or suspended cannot view live dispatch
  const isApproved = driverProfile?.verification_status === 'approved' || driverProfile?.verification_status === 'verified';
  if (!isApproved) {
    return <DriverVerificationGate />;
  }

  // When a booking is active, render dedicated Full-Screen Driver Travel Page (maps, paths, cancel/arrive/start/complete only)
  if (activeTrip && tripState !== 'idle' && tripState !== 'completed') {
    return (
      <DriverTravelPage
        booking={activeTrip}
        driverLat={driverProfile?.current_lat}
        driverLng={driverProfile?.current_lng}
        onExitTravel={handleDismissCompleted}
      />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pt-1 pb-8 font-sans">
      
      {/* Top Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-1.5 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#003f87] text-white flex items-center justify-center shadow-md shrink-0 aspect-square">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-[#00C1FD]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-[#003f87] dark:text-[#00C1FD] whitespace-nowrap truncate">
              {t('driver.liveQueue', 'Live Dispatch')}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium whitespace-nowrap truncate">
              {driverProfile?.terminal_name || t('driver.terminalQueue', 'Bauang TODA Queue')}
            </p>
          </div>
        </div>

        {/* Driver Quick Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Functional Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-[#003f87] dark:text-sky-300 hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 shrink-0"
            title={t('driver.switchLanguage', 'Switch Language / Magpalit ng Wika')}
          >
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#003f87] dark:text-sky-400 shrink-0" />
            <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = soundService.toggleSound();
              setIsSoundOn(next);
              if (next) soundService.requestPermission();
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors shadow-sm cursor-pointer shrink-0 ${
              isSoundOn
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={isSoundOn ? t('driver.soundOn', 'Sound Alert: ON') : t('driver.soundMuted', 'Sound Alert: MUTED')}
          >
            {isSoundOn ? <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>

          <button
            onClick={toggleDriverAvailability}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-bold text-[10px] sm:text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Power className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span>{isOnline ? t('driver.online', 'ONLINE') : t('driver.offline', 'OFFLINE')}</span>
          </button>

          <button
            onClick={signOut}
            className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shadow-sm cursor-pointer shrink-0"
            title={t('nav.signOut', 'Sign Out')}
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </header>

      {/* Dispatch Section */}
      <section className="space-y-4">
        {activeTrip && tripState !== 'completed' && tripState !== 'idle' ? (
          /* Active Ongoing Trip Card */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border-2 border-[#003f87]/30 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                tripState === 'in_transit'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-sky-100 text-[#003f87] dark:bg-sky-950 dark:text-[#00C1FD]'
              }`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                <span>
                  {tripState === 'assigned' && t('driver.headingToPickup', 'PAPUNTA SA SAKAYAN')}
                  {tripState === 'arrived' && t('driver.atPickup', 'NASA SAKAYAN NA')}
                  {tripState === 'in_transit' && t('driver.inTransit', 'KASALUKUYANG BUMIBIYAHE')}
                </span>
              </span>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  {t('driver.regulatedFare', 'Regulated Fare')}
                </span>
                <div className="text-xl font-black text-[#003f87] dark:text-[#00C1FD]">
                  ₱{activeTrip.estimated_fare.toFixed(2)}
                </div>
                {isDiscountEligibleType(activeTrip.passenger?.passenger_type || (activeTrip as any)?.passenger_type) && (
                  <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md inline-block">
                    -20% {getPassengerTypeInfo(activeTrip.passenger?.passenger_type || (activeTrip as any)?.passenger_type).label}
                  </span>
                )}
              </div>
            </div>

            {/* 1. Interactive Live Road Map */}
            <DriverActiveTripMap
              booking={activeTrip}
              driverLat={driverLocation.lat}
              driverLng={driverLocation.lng}
              tripState={tripState}
            />

            {/* 2. Trip Route Details */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl text-xs space-y-3 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-start gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#00A3FF] mt-0.5 shrink-0 border-2 border-white shadow-sm"></div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-black text-slate-400">
                    {t('driver.pickup', 'Sakayan')}
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{activeTrip.origin_name}</div>
                </div>
              </div>

              <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-600 ml-1.5 h-3"></div>

              <div className="flex items-start gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF6B00] mt-0.5 shrink-0 border-2 border-white shadow-sm"></div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-black text-slate-400">
                    {t('driver.dropoff', 'Babaan')}
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{activeTrip.destination_name}</div>
                </div>
              </div>
            </div>

            {/* Interactive Dispatch Progression Button */}
            <div>
              {tripState === 'assigned' && (
                <button
                  onClick={handleArrivePickup}
                  className="w-full h-11 sm:h-12 rounded-xl bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap px-3"
                >
                  <Navigation className="w-4 h-4 text-[#00C1FD] shrink-0" />
                  <span className="truncate">{t('driver.arrivedBtn', 'Nasa Sakayan Na')}</span>
                </button>
              )}

              {tripState === 'arrived' && (
                <button
                  onClick={handleStartTrip}
                  className="w-full h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap px-3"
                >
                  <Bike className="w-4 h-4 text-white shrink-0" />
                  <span className="truncate">{t('driver.startTripBtn', 'Simulan ang Biyahe')}</span>
                </button>
              )}

              {tripState === 'in_transit' && (
                <button
                  onClick={handleCompleteTrip}
                  className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-[#003f87] to-[#0056b3] hover:from-[#002f66] hover:to-[#003f87] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap px-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00C1FD] shrink-0" />
                  <span className="truncate">{t('driver.completeTripBtn', 'Tapusin ang Biyahe')} (₱{activeTrip.estimated_fare.toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Available Queue Requests */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                {t('driver.liveQueue', 'Live Dispatch Queue')} ({openDispatches.length})
              </h4>
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 sm:px-2.5 py-0.5 rounded-full">
                {isOnline ? t('driver.online', 'ONLINE') : t('driver.offline', 'OFFLINE')}
              </span>
            </div>

            {openDispatches.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {openDispatches.map((bk) => {
                  const distKm = getDistanceKm(driverLocation.lat, driverLocation.lng, bk.origin_lat, bk.origin_lng);
                  const formattedDist = formatProximityDistance(distKm, i18n.language);

                  return (
                    <div
                      key={bk.id}
                      onClick={() => setPreviewBooking(bk)}
                      className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 shadow-sm hover:border-[#003f87]/50 dark:hover:border-sky-400/50 hover:shadow-md transition-all cursor-pointer space-y-2 sm:space-y-3 group"
                    >
                      {/* Header Row: Bagong Tawag, Proximity & Regulated Fare */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700/60 pb-1.5 sm:pb-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                            {t('driver.incomingRequest', 'New Passenger Request!')}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-sky-100 dark:bg-sky-950 text-[#003f87] dark:text-[#00C1FD]">
                            📍 {formattedDist} {i18n.language === 'en' ? 'away (≤1km)' : 'layo (≤1km)'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-[#003f87] dark:text-[#00C1FD]">
                            ₱{bk.estimated_fare.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Stacked Route: Sakayan (Cyan) & Babaan (Orange) */}
                      <div className="space-y-0.5 sm:space-y-1 px-0.5">
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#00A3FF] ring-2 sm:ring-4 ring-[#00A3FF]/20 shrink-0 mt-0.5"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] sm:text-[9px] uppercase font-black text-[#00A3FF] block tracking-wider leading-none">
                              {t('driver.pickup', 'SAKAYAN')}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                              {bk.origin_name}
                            </span>
                          </div>
                        </div>

                        <div className="border-l border-dashed border-slate-300 dark:border-slate-600 ml-1 h-1.5 sm:h-2"></div>

                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#FF6B00] ring-2 sm:ring-4 ring-[#FF6B00]/20 shrink-0 mt-0.5"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] sm:text-[9px] uppercase font-black text-[#FF6B00] block tracking-wider leading-none">
                              {t('driver.dropoff', 'BABAAN')}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                              {bk.destination_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Preview Map & Accept Booking */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewBooking(bk);
                          }}
                          className="w-full h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] min-[360px]:text-[11px] sm:text-xs border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm whitespace-nowrap min-w-0"
                        >
                          <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#003f87] dark:text-[#00C1FD] shrink-0" />
                          <span className="truncate">{t('driver.viewRoute', 'View Route')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptBooking(bk);
                          }}
                          className="w-full h-9 sm:h-10 px-2 sm:px-3 bg-[#003f87] hover:bg-[#0056b3] text-white font-black text-[10px] min-[360px]:text-[11px] sm:text-xs rounded-xl shadow-md shadow-[#003f87]/20 active:scale-95 transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap min-w-0"
                        >
                          <Bike className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00C1FD] shrink-0" />
                          <span className="truncate">{t('driver.acceptRide', 'Tanggapin')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center gap-2">
                <Clock className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                <span className="font-medium max-w-xs leading-relaxed">
                  {i18n.language === 'en'
                    ? 'No requests within 1.0 km right now. Dispatches will dynamically alert you when you drive into their 1.0 km radius!'
                    : 'Walang pasahero sa loob ng 1.0 km ngayon. Awtomatikong magpapadala ng alerto kapag pumasok ka sa 1.0 km sakop ng pasahero!'}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trip Completed Cash Collection Summary Dialog */}
      {completedFare !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {t('driver.tripCompletedTitle', 'Trip Completed Successfully!')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('driver.tripCompletedDesc', 'Passenger safely delivered to destination.')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300">
                {t('driver.collectFareCash', 'Singiling Pamasahe (Cash)')}
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₱{completedFare.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleDismissCompleted}
              className="w-full py-3.5 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm shadow-md shadow-[#003f87]/20 active:scale-98 transition-all cursor-pointer"
            >
              {t('driver.backToTerminal', 'Return to Dashboard')}
            </button>
          </div>
        </div>
      )}

      {/* Booking Route Preview Modal */}
      {previewBooking && (
        <BookingPreviewModal
          booking={previewBooking}
          driverLat={driverLocation.lat}
          driverLng={driverLocation.lng}
          onClose={() => setPreviewBooking(null)}
          onAccept={(bk) => {
            setPreviewBooking(null);
            handleAcceptBooking(bk);
          }}
        />
      )}

    </div>
  );
};

export default DriverDispatch;
