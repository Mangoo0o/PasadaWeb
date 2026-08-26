import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  Heart, 
  Bike, 
  PhoneCall, 
  Globe, 
  CheckCircle2, 
  Percent, 
  AlertTriangle,
  History,
  Compass,
  ChevronRight,
  Clock,
  MessageSquareWarning,
  MapPin
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Booking } from '../types/database.types';
import { fetchUserBookings } from '../services/bookingService';

interface PassengerProfileProps {
  setActiveTab?: (tab: string) => void;
}

export const PassengerProfile: React.FC<PassengerProfileProps> = ({ setActiveTab }) => {
  const { t, i18n } = useTranslation();
  const { user, signOut, setLanguage } = useAuth();
  
  // Local state for commuter discount simulation & preferences
  const [discountType, setDiscountType] = useState<string>(() => {
    return localStorage.getItem('pasada_discount_type') || 'regular';
  });

  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const loadRecentHistory = async () => {
      if (user) {
        setIsLoadingHistory(true);
        try {
          const data = await fetchUserBookings(user.id, false);
          // Show only latest 3 trips for a clean, compact preview
          setRecentBookings(data.slice(0, 3));
        } catch (err) {
          console.error("Error loading recent trips:", err);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };
    loadRecentHistory();
  }, [user?.id]);

  const handleSetDiscount = (type: string) => {
    setDiscountType(type);
    localStorage.setItem('pasada_discount_type', type);
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setLanguage(nextLang);
  };

  if (!user) {
    return null;
  }

  const isDiscountEligible = discountType !== 'regular';

  return (
    <div className="w-full space-y-3.5 pt-1 pb-10 font-sans max-w-xl mx-auto select-none">
      
      {/* 1. Header Bar */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0052d1] text-white flex items-center justify-center shadow-md shrink-0">
            <User className="w-4 h-4 text-[#fcd400]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#0052d1] uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#fcd400]" />
              <span>{t('profile.subtitle')}</span>
            </div>
            <h1 className="text-xs sm:text-sm font-black text-[#191c1e] dark:text-white truncate">
              {t('profile.title')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Functional Language Switch with Account Sync */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold bg-[#0052d1]/10 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300 hover:bg-[#0052d1]/20 transition-all cursor-pointer border border-[#0052d1]/20 dark:border-slate-700 active:scale-95"
            title="Switch Language / Magpalit ng Wika"
          >
            <Globe className="w-3.5 h-3.5 text-[#0052d1]" />
            <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shadow-xs cursor-pointer active:scale-95"
            title={t('auth.logoutConfirm')}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Profile Card */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex items-center gap-3.5 text-left">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#0052d1]/5 rounded-bl-full pointer-events-none -z-0"></div>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-md bg-gradient-to-tr from-[#0052d1] to-[#206afa] text-white flex items-center justify-center text-2xl font-black">
            {user.full_name?.charAt(0) || 'P'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center">
            <ShieldCheck className="w-3 h-3" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 space-y-0.5 z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              {t('profile.verifiedCommuter')}
            </span>
            {isDiscountEligible && (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-0.5">
                <Percent className="w-2.5 h-2.5" />
                {t('profile.discountBadge')}
              </span>
            )}
          </div>

          <h2 className="text-sm sm:text-base font-black text-[#191c1e] dark:text-white truncate">
            {user.full_name || 'Ka-Pasada Commuter'}
          </h2>
          <p className="text-[11px] text-slate-500 truncate">
            {user.phone_number ? `📱 ${user.phone_number}` : 'Registered Bauang Commuter'}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold">
            {t('profile.memberSince')}: {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* 3. Merged Recent Trip History Preview with "See More" */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#0052d1]" />
            <h3 className="text-xs sm:text-sm font-extrabold text-[#191c1e] dark:text-white">
              {t('profile.recentTrips')}
            </h3>
          </div>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab('history')}
              className="text-[#0052d1] hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
            >
              <span>{t('profile.seeAll')}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Trips List Preview */}
        {isLoadingHistory ? (
          <div className="space-y-1.5 py-1">
            {[1, 2].map(n => (
              <div key={n} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
            <Clock className="w-5 h-5 text-slate-400 mx-auto" />
            <p className="text-[11px] text-slate-500 font-medium">
              {t('profile.noTripsYet')}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentBookings.map((b) => {
              const fare = Number(b.final_fare || b.estimated_fare || 20).toFixed(2);
              const dateStr = new Date(b.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fil-PH', {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={b.id}
                  onClick={() => setActiveTab && setActiveTab('history')}
                  className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-sky-50/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#0052d1]/10 text-[#0052d1] flex items-center justify-center shrink-0">
                      <Bike className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {b.destination_name || 'Bauang Route'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {dateStr} • Body #{b.driver?.body_number || '0142'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#0052d1] dark:text-sky-400 block">
                      ₱{fare}
                    </span>
                    <span className={`text-[9px] font-bold uppercase ${b.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {b.status === 'completed' ? (i18n.language === 'en' ? 'Completed' : 'Tapos Na') : b.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick link to Complaint Desk */}
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('history')}
            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200/80 dark:border-rose-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>{t('profile.complaintProblem')}</span>
          </button>
        )}
      </section>

      {/* 4. Special 20% Taripa Discount Settings */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#191c1e] dark:text-white">
                {t('profile.discountsTitle')}
              </h3>
              <p className="text-[10px] text-slate-500">
                {t('profile.discountsSub')}
              </p>
            </div>
          </div>

          {isDiscountEligible && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
              {t('profile.active')}
            </span>
          )}
        </div>

        {/* Discount Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
          {[
            { id: 'regular', label: t('profile.regular'), desc: 'Taripa' },
            { id: 'student', label: t('profile.student'), desc: '20% Off' },
            { id: 'senior', label: t('profile.senior'), desc: '20% Off' },
            { id: 'pwd', label: t('profile.pwd'), desc: '20% Off' }
          ].map((type) => {
            const isSelected = discountType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => handleSetDiscount(type.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0052d1] text-white border-[#0052d1] shadow-sm shadow-[#0052d1]/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black">{type.label}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-[#fcd400]" />}
                </div>
                <span className={`text-[9px] block ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                  {type.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Emergency Hotlines & Safety SOS */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs sm:text-sm font-extrabold text-[#191c1e] dark:text-white">
            {t('profile.emergencyTitle')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* PNP Hotline */}
          <a 
            href="tel:0727051234"
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="min-w-0 pr-1">
              <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{t('profile.pnp')}</div>
              <div className="text-[9px] text-slate-500 font-mono">(072) 705-1234</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#0052d1] text-white flex items-center justify-center shrink-0">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* MDRRMO Ambulance */}
          <a 
            href="tel:0727055555"
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="min-w-0 pr-1">
              <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{t('profile.rescue')}</div>
              <div className="text-[9px] text-slate-500 font-mono">(072) 705-5555</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
          </a>
        </div>
      </section>

      {/* 6. Quick Navigation Shortcuts */}
      {setActiveTab && (
        <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
          <button
            onClick={() => setActiveTab('home')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors rounded-xl cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Compass className="w-3.5 h-3.5 text-[#0052d1]" />
              <span>{t('profile.exploreSpots')}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveTab('pasada')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors rounded-xl cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Bike className="w-3.5 h-3.5 text-[#0052d1]" />
              <span>{t('profile.liveBooking')}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </section>
      )}

      {/* 7. Sign Out Button */}
      <div className="pt-1">
        <button
          onClick={signOut}
          className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('profile.signOut')}</span>
        </button>
      </div>

    </div>
  );
};
