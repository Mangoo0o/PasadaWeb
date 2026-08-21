import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Booking } from '../types/database.types';
import { fetchOpenDispatches, updateBookingStatus, subscribeToOpenDispatches, fetchActiveTrip } from '../services/bookingService';
import { BookingPreviewModal } from '../components/booking/BookingPreviewModal';

export const DriverDispatch: React.FC = () => {
  const { t } = useTranslation();
  const { user, driverProfile, toggleDriverAvailability, signOut } = useAuth();

  const isOnline = driverProfile?.is_available ?? true;
  const [openDispatches, setOpenDispatches] = useState<Booking[]>([]);
  const [activeTrip, setActiveTrip] = useState<Booking | null>(null);
  const [tripState, setTripState] = useState<'idle' | 'assigned' | 'arrived' | 'in_transit' | 'completed'>('idle');
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  const [completedFare, setCompletedFare] = useState<number | null>(null);

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
      setOpenDispatches(dispatches);
    };
    loadDispatches();

    const unsubscribe = subscribeToOpenDispatches(() => {
      loadDispatches();
    });

    const interval = setInterval(loadDispatches, 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  const handleAcceptBooking = async (booking: Booking) => {
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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pt-3 pb-24 px-3 sm:px-4 font-sans">
      
      {/* Top Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#003f87] text-white flex items-center justify-center shadow-md">
            <Navigation className="w-5 h-5 text-[#00C1FD]" />
          </div>
          <div>
            <h1 className="text-sm font-black text-[#003f87] dark:text-[#00C1FD]">
              Live Dispatch &amp; Passenger Calls
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Bauang Tricycle TODA Dispatch Queue
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDriverAvailability}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <button
            onClick={signOut}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shadow-sm cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Dispatch Section */}
      <section className="space-y-4">
        {activeTrip && tripState !== 'completed' && tripState !== 'idle' ? (
          /* Active Ongoing Trip Card */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border-2 border-[#003f87]/40 shadow-lg space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                {tripState === 'assigned' && 'PAPUNTA SA SAKAYAN'}
                {tripState === 'arrived' && 'NASA SAKAYAN NA'}
                {tripState === 'in_transit' && 'KASALUKUYANG BUMIBIYAHE'}
              </span>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Regulated Fare</span>
                <div className="text-xl font-black text-[#003f87] dark:text-[#00C1FD]">
                  ₱{activeTrip.estimated_fare.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Trip Route Details */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl text-xs space-y-3 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2.5">
                <div className="w-3 h-3 rounded-full bg-[#003f87] mt-1 shrink-0"></div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400">Sakayan (Pickup)</div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{activeTrip.origin_name}</div>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-600 ml-1.5 h-4"></div>
              <div className="flex items-start gap-2.5">
                <div className="w-3 h-3 rounded-full bg-[#fcd400] mt-1 shrink-0"></div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400">Babaan (Destination)</div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{activeTrip.destination_name}</div>
                </div>
              </div>
            </div>

            {/* Interactive Dispatch Progression Button */}
            <div>
              {tripState === 'assigned' && (
                <button
                  onClick={handleArrivePickup}
                  className="w-full py-4 rounded-xl bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-[#00C1FD]" />
                  <span>Nakarating na sa Sakayan (Arrived)</span>
                </button>
              )}

              {tripState === 'arrived' && (
                <button
                  onClick={handleStartTrip}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Bike className="w-4 h-4 text-white" />
                  <span>Simulan ang Byahe (Start Trip)</span>
                </button>
              )}

              {tripState === 'in_transit' && (
                <button
                  onClick={handleCompleteTrip}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#003f87] to-[#0056b3] hover:from-[#002f66] hover:to-[#003f87] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
                  <span>Tapusin at Singilin (₱{activeTrip.estimated_fare.toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Available Queue Requests */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                Bukas na Kahilingan sa Bauang ({openDispatches.length})
              </h4>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
                {isOnline ? 'Nakaabang sa Pila' : 'Naka-offline'}
              </span>
            </div>

            {openDispatches.length > 0 ? (
              <div className="space-y-3">
                {openDispatches.map((bk) => (
                  <div
                    key={bk.id}
                    onClick={() => setPreviewBooking(bk)}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-[#003f87]/50 dark:hover:border-sky-400/50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="space-y-1 text-xs min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-[#003f87] dark:group-hover:text-[#00C1FD] transition-colors">
                        {bk.origin_name} ➔ {bk.destination_name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Distansya: <strong>{bk.estimated_distance_km} km</strong></span>
                        <span>•</span>
                        <span className="font-black text-[#003f87] dark:text-[#00C1FD]">₱{bk.estimated_fare.toFixed(2)}</span>
                        <span>•</span>
                        <span className="text-[10px] text-[#003f87] dark:text-[#00C1FD] underline font-bold">I-preview ang Mapa</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptBooking(bk);
                      }}
                      className="px-5 py-2.5 bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      Tanggapin
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center gap-2">
                <Clock className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                <span className="font-medium">Walang nakabinbing tawag sa kasalukuyan. Nakaabang sa pila ng terminal...</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trip Completed Cash Collection Summary Dialog */}
      {completedFare !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
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
              onClick={handleDismissCompleted}
              className="w-full py-3.5 rounded-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm shadow-md shadow-[#003f87]/20 active:scale-98 transition-all cursor-pointer"
            >
              Bumalik sa Pila ng Terminal
            </button>
          </div>
        </div>
      )}

      {/* Booking Route Preview Modal */}
      {previewBooking && (
        <BookingPreviewModal
          booking={previewBooking}
          driverLat={driverProfile?.current_lat}
          driverLng={driverProfile?.current_lng}
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
