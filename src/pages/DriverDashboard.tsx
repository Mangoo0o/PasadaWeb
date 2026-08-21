import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Power, 
  Navigation, 
  CheckCircle2, 
  Star, 
  TrendingUp, 
  ShieldCheck,
  LogOut,
  Car,
  Phone,
  Clock,
  MapPin,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Award,
  CircleCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Booking } from '../types/database.types';
import { fetchOpenDispatches, updateBookingStatus } from '../services/bookingService';

export const DriverDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, driverProfile, toggleDriverAvailability, signOut } = useAuth();

  const isOnline = driverProfile?.is_available ?? true;
  const [openDispatches, setOpenDispatches] = useState<Booking[]>([]);
  const [activeTrip, setActiveTrip] = useState<Booking | null>(null);
  const [tripState, setTripState] = useState<'idle' | 'assigned' | 'arrived' | 'in_transit' | 'completed'>('idle');

  useEffect(() => {
    const loadDispatches = async () => {
      const dispatches = await fetchOpenDispatches();
      setOpenDispatches(dispatches);
    };
    loadDispatches();
    const interval = setInterval(loadDispatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptBooking = async (booking: Booking) => {
    setActiveTrip(booking);
    setTripState('assigned');
    await updateBookingStatus(booking.id, 'driver_assigned', driverProfile?.id);
  };

  const handleArrivePickup = async () => {
    setTripState('arrived');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'driver_arrived');
    }
  };

  const handleStartTrip = async () => {
    setTripState('in_transit');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'in_transit');
    }
  };

  const handleCompleteTrip = async () => {
    setTripState('completed');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'completed', driverProfile?.id, activeTrip.estimated_fare);
    }
    setTimeout(() => {
      setActiveTrip(null);
      setTripState('idle');
    }, 2500);
  };

  if (!user || user.role !== 'driver') {
    return (
      <div className="w-full max-w-md mx-auto text-center pt-16 pb-24 px-4 space-y-4 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-[#003f87] text-white flex items-center justify-center mx-auto shadow-lg">
          <Bike className="w-8 h-8 text-[#00C1FD]" />
        </div>
        <h2 className="text-2xl font-black text-[#003f87] dark:text-white">
          Bauang Driver Portal
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Mag-login bilang rehistradong tricycle driver ng Bauang upang makatanggap ng dispatch at pasahero.
        </p>
        <button
          onClick={signOut}
          className="px-6 py-3 bg-[#003f87] text-white font-bold text-xs rounded-full hover:bg-[#002f66] transition-colors shadow-md active:scale-95 cursor-pointer"
        >
          Mag-login Bilang Driver
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pt-3 pb-24 px-3 sm:px-4 font-sans">
      
      {/* Top Header / Status Bar */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#003f87] text-white flex items-center justify-center shadow-md">
            <Bike className="w-5 h-5 text-[#00C1FD]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#003f87] dark:text-[#00C1FD]">
                Driver Dashboard
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                BAUANG
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Smart Transit Driver Terminal
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

      {/* 1. Driver Hero Section (Stitch Style) */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-md relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center gap-5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#003f87]/5 rounded-bl-full pointer-events-none -z-0"></div>

        {/* Avatar with Verified Badge */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-sky-50 dark:bg-slate-800 flex items-center justify-center">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#003f87] to-[#0056b3] text-white flex items-center justify-center text-3xl font-black">
                {user.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Details & Association */}
        <div className="flex-1 space-y-1 z-10">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#003f87]/10 text-[#003f87] dark:text-[#00C1FD]">
              Body #{driverProfile?.body_number || '0142'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CircleCheck className="w-3 h-3" />
              <span>LGU Verified</span>
            </span>
          </div>

          <h2 className="text-2xl font-black text-[#071e27] dark:text-slate-100 tracking-tight">
            {user.full_name}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {driverProfile?.terminal_name || 'Bauang Central TODA (Poblacion)'}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
              <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{driverProfile?.rating_avg ? driverProfile.rating_avg.toFixed(2) : '4.95'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Rating</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
              <div className="text-sm font-black text-[#003f87] dark:text-[#00C1FD]">
                {driverProfile?.total_trips ?? 24}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Biyahe</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
              <div className="text-sm font-black text-emerald-600">
                ₱{driverProfile?.earnings_today !== undefined ? driverProfile.earnings_today.toFixed(2) : '320.00'}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Kita Ngayon</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Vehicle Details Card (Stitch Style) */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center text-[#003f87] dark:text-[#00C1FD] shrink-0 border border-sky-100 dark:border-slate-700">
          <Bike className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
            Rehistradong Tricycle
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {driverProfile?.tricycle_model || 'Honda TMX 125 (Standard Tricycle)'}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="inline-block px-2.5 py-0.5 bg-[#003f87] text-white font-mono font-black text-xs rounded-md shadow-sm">
              {driverProfile?.plate_number || '1234-AB'}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">
              Body No: #{driverProfile?.body_number || '0142'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Live Dispatch Queue / Active Trip */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#003f87] dark:text-[#00C1FD]" />
            <span>Tawag ng Pasahero / Dispatch</span>
          </h3>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
            {isOnline ? 'Nakaabang sa Pila' : 'Naka-offline'}
          </span>
        </div>

        {activeTrip && tripState !== 'completed' && tripState !== 'idle' ? (
          /* Active Ongoing Trip Card */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border-2 border-[#003f87]/40 shadow-lg space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
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
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#003f87] mt-1 shrink-0"></div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400">Sakayan (Pickup)</div>
                  <div className="font-bold text-slate-900 dark:text-white">{activeTrip.origin_name}</div>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-600 ml-1 h-3"></div>
              <div className="flex items-start gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#fcd400] mt-1 shrink-0"></div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400">Babaan (Destination)</div>
                  <div className="font-bold text-slate-900 dark:text-white">{activeTrip.destination_name}</div>
                </div>
              </div>
            </div>

            {/* Interactive Dispatch Progression Button */}
            <div>
              {tripState === 'assigned' && (
                <button
                  onClick={handleArrivePickup}
                  className="w-full py-3.5 rounded-xl bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-[#00C1FD]" />
                  <span>Nakarating na sa Sakayan (Arrived)</span>
                </button>
              )}

              {tripState === 'arrived' && (
                <button
                  onClick={handleStartTrip}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Bike className="w-4 h-4 text-white" />
                  <span>Simulan ang Byahe (Start Trip)</span>
                </button>
              )}

              {tripState === 'in_transit' && (
                <button
                  onClick={handleCompleteTrip}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#003f87] to-[#0056b3] hover:from-[#002f66] hover:to-[#003f87] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
                  <span>Tapusin at Singilin (₱{activeTrip.estimated_fare.toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Available Queue Requests */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
              Bukas na Kahilingan sa Bauang ({openDispatches.length})
            </h4>

            {openDispatches.length > 0 ? (
              <div className="space-y-2.5">
                {openDispatches.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-[#003f87]/40 transition-colors"
                  >
                    <div className="space-y-0.5 text-xs min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {bk.origin_name} ➔ {bk.destination_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Distansya: {bk.estimated_distance_km} km</span>
                        <span>•</span>
                        <strong className="text-[#003f87] dark:text-[#00C1FD]">₱{bk.estimated_fare.toFixed(2)}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptBooking(bk)}
                      className="px-4 py-2 bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      Tanggapin
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-7 text-xs text-slate-400 flex flex-col items-center gap-1.5">
                <Clock className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                <span>Walang nakabinbing tawag sa kasalukuyan. Nakaabang sa pila ng terminal...</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Recent Passenger Feedback (Stitch Style) */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Komentaryo at Feedback ng Pasahero
        </h3>
        
        <div className="space-y-2">
          <div className="bg-white/95 dark:bg-slate-900/95 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-100 text-[#003f87] font-bold text-[10px] flex items-center justify-center">
                  M
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Maria Santos</span>
              </div>
              <div className="flex text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              "Napakabait ni Manong Driver at maingat magpatakbo. Tamang taripa ang siningil patungong tabing-dagat."
            </p>
          </div>

          <div className="bg-white/95 dark:bg-slate-900/95 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">
                  J
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Juan Dela Peña</span>
              </div>
              <div className="flex text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              "Mabilis dumating sa sakayan. Sakto sa rate ng PasadaGuide."
            </p>
          </div>
        </div>
      </section>

      {/* 5. Safety & LGU Accreditation Info */}
      <section className="bg-sky-50/70 dark:bg-slate-800/60 rounded-2xl p-4 border border-sky-200/70 dark:border-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-900 dark:text-white block mb-0.5">
            Bauang LGU Transport Board Accreditation
          </strong>
          Ang iyong tricycle franchise at lisensya ay opisyal na rehistrado sa ilalim ng Bauang Municipal Tricycle Franchising & Regulatory Board (MTFRB).
        </div>
      </section>

    </div>
  );
};

export default DriverDashboard;
