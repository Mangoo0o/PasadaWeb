import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Power, 
  Navigation, 
  Star, 
  TrendingUp, 
  ShieldCheck, 
  LogOut, 
  ChevronRight, 
  Clock,
  Sparkles,
  Award,
  CircleCheck,
  UserCheck,
  MapPin,
  Compass,
  Globe
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Booking } from '../types/database.types';
import { fetchOpenDispatches, subscribeToOpenDispatches, updateBookingStatus, fetchActiveTrip } from '../services/bookingService';
import { BookingPreviewModal } from '../components/booking/BookingPreviewModal';

interface DriverDashboardProps {
  setActiveTab?: (tab: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ setActiveTab }) => {
  const { t, i18n } = useTranslation();
  const { user, driverProfile, toggleDriverAvailability, signOut, setLanguage } = useAuth();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setLanguage(nextLang);
  };

  const isOnline = driverProfile?.is_available ?? true;
  const [openDispatches, setOpenDispatches] = useState<Booking[]>([]);
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  const [activeOngoingTrip, setActiveOngoingTrip] = useState<Booking | null>(null);

  useEffect(() => {
    const loadDispatches = async () => {
      if (user?.id) {
        const [dispatches, active] = await Promise.all([
          fetchOpenDispatches(),
          fetchActiveTrip(user.id, true)
        ]);
        setOpenDispatches(dispatches);
        setActiveOngoingTrip(active);
      }
    };

    loadDispatches();

    const unsubscribe = subscribeToOpenDispatches((detail) => {
      if (detail?.id && detail.status && detail.status !== 'searching') {
        setOpenDispatches(prev => prev.filter(b => b.id !== detail.id));
        setPreviewBooking(prev => prev?.id === detail.id ? null : prev);
      }
      loadDispatches();
    });

    // Relaxed 30-second synchronization heartbeat instead of aggressive 3s polling
    const interval = setInterval(loadDispatches, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  // Auto-dismiss preview modal if booking was cancelled by passenger or accepted by another driver
  useEffect(() => {
    if (previewBooking && openDispatches.length > 0 && !openDispatches.some(b => b.id === previewBooking.id)) {
      setPreviewBooking(null);
    }
  }, [openDispatches, previewBooking]);

  if (!user || user.role !== 'driver') {
    return null;
  }

  return (
    <div className="w-full space-y-4 pt-1 pb-4 font-sans">
      
      {/* Active Ongoing Trip Banner */}
      {activeOngoingTrip && (
        <div className="bg-gradient-to-r from-[#0052d1] to-[#206afa] rounded-2xl p-4 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#fcd400] block">
              {t('driver.activeTripBanner', 'Active Trip')}
            </span>
            <div className="text-xs sm:text-sm font-bold truncate">
              {activeOngoingTrip.origin_name} ➔ {activeOngoingTrip.destination_name}
            </div>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('dispatch')}
              className="px-4 py-2 rounded-xl bg-[#fcd400] text-[#131b2e] font-black text-xs shadow-md hover:bg-amber-300 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              {t('driver.openMap', 'Open Map')}
            </button>
          )}
        </div>
      )}

      {/* Top Header / Status Bar */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0052d1] text-white flex items-center justify-center shadow-md shrink-0 aspect-square">
            <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-[#fcd400]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-black text-[#0052d1] dark:text-sky-400 truncate">
                {t('driver.dashboardTitle', 'Driver Dashboard')}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                BAUANG
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">
              {driverProfile?.terminal_name || 'Bauang Central TODA'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Functional Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300 hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
            title={t('driver.switchLanguage', 'Switch Language / Magpalit ng Wika')}
          >
            <Globe className="w-3.5 h-3.5 text-[#0052d1]" />
            <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
          </button>

          <button
            onClick={toggleDriverAvailability}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{isOnline ? t('driver.online', 'ONLINE') : t('driver.offline', 'OFFLINE')}</span>
          </button>

          <button
            onClick={signOut}
            className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shadow-sm cursor-pointer shrink-0"
            title={t('nav.signOut', 'Sign Out')}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* Driver Status Hero Banner */}
      <section className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-white transition-all shadow-xl ${
        isOnline 
          ? 'bg-gradient-to-r from-[#003f87] via-[#0056b3] to-[#0070eb] shadow-[#003f87]/20' 
          : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 shadow-slate-900/20'
      }`}>
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                {t('driver.bodyNo', 'Body #')}{driverProfile?.body_number || '0142'}
              </span>
              <span className="text-[9px] sm:text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-medium truncate max-w-[140px]">
                {driverProfile?.terminal_name || 'Bauang Central TODA'}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight mt-1 sm:mt-1.5 truncate">
              {t('driver.greetings', { name: user.full_name.split(' ')[0], defaultValue: `Kumusta, ${user.full_name.split(' ')[0]}!` })}
            </h2>
            <p className="text-[11px] sm:text-xs text-white/90 mt-0.5">
              {isOnline ? t('driver.statusOnlineMsg', '🟢 Active and ready to accept passengers.') : t('driver.statusOfflineMsg', '⚪ Offline — Tap ONLINE to start duty.')}
            </p>
          </div>

          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/40 shadow-inner shrink-0 hidden sm:block">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center text-lg sm:text-xl font-black">
                {user.full_name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center">
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
            {t('driver.todayEarnings', "Today's Earnings")}
          </div>
          <div className="text-sm sm:text-xl font-black text-emerald-600 mt-0.5 sm:mt-1 truncate">
            ₱{driverProfile?.earnings_today !== undefined ? driverProfile.earnings_today.toFixed(2) : '320.00'}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-bold flex items-center justify-center gap-1">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
            <span className="truncate">TODA</span>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
            {t('driver.ratingLabel', 'Rating')}
          </div>
          <div className="text-sm sm:text-xl font-black text-amber-500 mt-0.5 sm:mt-1 flex items-center justify-center gap-0.5 sm:gap-1">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400" />
            <span>{driverProfile?.rating_avg ? driverProfile.rating_avg.toFixed(2) : '4.95'}</span>
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-bold truncate">
            {t('driver.fiveStarDriver', '5-Star Driver')}
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
            {t('driver.completedTrips', 'Biyahe')}
          </div>
          <div className="text-sm sm:text-xl font-black text-[#003f87] dark:text-[#00C1FD] mt-0.5 sm:mt-1">
            {driverProfile?.total_trips ?? 24}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-bold truncate">
            {t('driver.completedTripsLabel', 'Naihatid')}
          </div>
        </div>
      </div>

      {/* Quick Access Dispatch Card */}
      <section className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#003f87] dark:text-[#00C1FD]" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              {t('driver.liveQueue', 'Live Dispatch Queue')} ({openDispatches.length})
            </h3>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('dispatch')}
              className="text-xs font-bold text-[#003f87] dark:text-[#00C1FD] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{t('driver.viewDispatch', 'Open Dispatch')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {openDispatches.length > 0 ? (
          <div className="space-y-2">
            {openDispatches.slice(0, 3).map((bk) => (
              <div
                key={bk.id}
                onClick={() => setPreviewBooking(bk)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-[#003f87]/50 dark:hover:border-sky-400/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="text-xs min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-[#003f87] dark:group-hover:text-[#00C1FD] transition-colors">
                    {bk.origin_name} ➔ {bk.destination_name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t('driver.distance', 'Distance')}: {bk.estimated_distance_km} km • <strong className="text-[#003f87] dark:text-[#00C1FD]">₱{bk.estimated_fare.toFixed(2)}</strong> • <span className="text-[10px] text-[#003f87] dark:text-[#00C1FD] underline font-bold">{t('driver.viewRoute', 'View Route')}</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewBooking(bk);
                  }}
                  className="px-3.5 py-1.5 bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  {t('driver.preview', 'Preview')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400 flex flex-col items-center gap-1">
            <Clock className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            <span>{t('driver.noDispatches', 'No passenger requests at the moment. Waiting in queue...')}</span>
          </div>
        )}
      </section>

      {/* Vehicle Specs Summary Card */}
      <section className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center text-[#003f87] dark:text-[#00C1FD]">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">
              {t('driver.registeredVehicle', 'Registered Tricycle')}
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="px-2 py-0.5 bg-[#003f87] text-white font-mono font-black text-[11px] rounded">
                {driverProfile?.plate_number || '1234-AB'}
              </span>
              <span className="text-slate-500 font-semibold text-[11px]">
                {t('driver.bodyNo', 'Body #')}{driverProfile?.body_number || '0142'}
              </span>
            </div>
          </div>
        </div>

        {setActiveTab && (
          <button
            onClick={() => setActiveTab('profile')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
          >
            {t('nav.profile', 'Profile')}
          </button>
        )}
      </section>

      {/* Booking Route Preview Modal */}
      {previewBooking && (
        <BookingPreviewModal
          booking={previewBooking}
          driverLat={driverProfile?.current_lat}
          driverLng={driverProfile?.current_lng}
          onClose={() => setPreviewBooking(null)}
          onAccept={async (bk) => {
            setPreviewBooking(null);
            setOpenDispatches(prev => prev.filter(b => b.id !== bk.id));
            await updateBookingStatus(bk.id, 'driver_assigned', driverProfile?.id || user?.id);
            if (setActiveTab) {
              setActiveTab('dispatch');
            }
          }}
        />
      )}

    </div>
  );
};

export default DriverDashboard;
