import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Star, 
  TrendingUp, 
  ShieldCheck, 
  LogOut,
  CircleCheck,
  UserCheck,
  Award,
  Phone,
  Car,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  ThumbsUp,
  MessageSquare,
  Globe
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchDriverReviews } from '../services/bookingService';

export const DriverProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, driverProfile, signOut, setLanguage } = useAuth();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setLanguage(nextLang);
  };
  const [liveReviews, setLiveReviews] = useState<Array<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    passenger_name?: string;
    route?: string;
  }>>([]);

  useEffect(() => {
    if (driverProfile?.id || user?.id) {
      fetchDriverReviews(driverProfile?.id || user?.id || '').then((revs) => {
        if (revs.length > 0) setLiveReviews(revs);
      });
    }
  }, [driverProfile?.id, user?.id]);

  if (!user || user.role !== 'driver') {
    return null;
  }

  return (
    <div className="w-full space-y-4 pt-1 pb-4 font-sans">
      
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0052d1] text-white flex items-center justify-center shadow-md shrink-0 aspect-square">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#fcd400]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-[#0052d1] dark:text-sky-400 truncate">
              {t('driver.profileTitle', 'Driver Profile')}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">
              {t('driver.profileSubtitle', 'Bauang MTFRB Licensing')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
            onClick={signOut}
            className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shadow-sm cursor-pointer shrink-0"
            title={t('nav.signOut', 'Sign Out')}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* 1. Driver Hero Section (Stitch Style) */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-md relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center gap-5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#0052d1]/5 rounded-bl-full pointer-events-none -z-0"></div>

        {/* Avatar with Verified Badge */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-sky-50 dark:bg-slate-800 flex items-center justify-center">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#0052d1] to-[#206afa] text-white flex items-center justify-center text-3xl font-black">
                {user.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center">
            <CircleCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Details & Association */}
        <div className="flex-1 space-y-1 z-10">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              {t('driver.bodyNo', 'Body #')}{driverProfile?.body_number || '0142'}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{t('driver.lguVerified', 'LGU Verified Driver')}</span>
            </span>
          </div>

          <h2 className="text-2xl font-black text-[#071e27] dark:text-slate-100 tracking-tight">
            {user.full_name}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {driverProfile?.terminal_name || 'Bauang Central TODA (Poblacion)'}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
              <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{driverProfile?.rating_avg ? driverProfile.rating_avg.toFixed(2) : '5.00'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{t('driver.ratingLabel', 'Rating')}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
              <div className="text-sm font-black text-[#003f87] dark:text-[#00C1FD]">
                {driverProfile?.total_trips ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{t('driver.completedTrips', 'Biyahe')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Vehicle Identification & Plate Details Card */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center text-[#003f87] dark:text-[#00C1FD] shrink-0 border border-sky-100 dark:border-slate-700">
          <Bike className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
            {t('driver.registeredVehicle', 'Registered Tricycle')}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="inline-block px-3 py-1 bg-[#003f87] dark:bg-[#0052d1] text-white font-mono font-black text-sm rounded-lg shadow-sm tracking-wider">
              {driverProfile?.plate_number || '1234-AB'}
            </div>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700">
              {t('driver.bodyNo', 'Body #')}{driverProfile?.body_number || '0142'}
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>{t('driver.authorizedFranchise', 'MTFRB Bauang Authorized Franchise')}</span>
          </p>
        </div>
      </section>

      {/* 3. Passenger Feedback & Commuter Reviews Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#003f87] dark:text-[#00C1FD]" />
            <span>{t('driver.passengerFeedback', 'Passenger Reviews & Feedback')}</span>
          </h3>
          <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{driverProfile?.rating_avg ? `${driverProfile.rating_avg.toFixed(2)} Rating` : '5.00 Rating'}</span>
          </span>
        </div>
        
        <div className="space-y-2.5">
          {liveReviews.length > 0 ? (
            liveReviews.map((rev) => (
              <div key={rev.id} className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-sky-100 text-[#003f87] font-bold text-xs flex items-center justify-center">
                      {rev.passenger_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{rev.passenger_name}</span>
                      <span className="text-[10px] text-slate-400">{rev.route || 'Bauang Tricycle Service'}</span>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                {rev.comment && rev.comment.trim().length > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic bg-slate-50/70 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    "{rev.comment}"
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-1.5">
              <MessageSquare className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('driver.noFeedback', 'No feedback received yet')}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('driver.noFeedbackDesc', 'Ratings and comments from your passengers will appear here.')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Safety & LGU Accreditation Card */}
      <section className="bg-sky-50/70 dark:bg-slate-800/60 rounded-2xl p-4 border border-sky-200/70 dark:border-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-900 dark:text-white block mb-0.5">
            {t('driver.accreditationTitle', 'Bauang LGU Transport Board Accreditation')}
          </strong>
          {t('driver.accreditationDesc', 'Ang iyong lisensya at prangkisa ay opisyal na rehistrado sa ilalim ng Bauang Municipal Tricycle Franchising & Regulatory Board (MTFRB).')}
        </div>
      </section>

    </div>
  );
};

export default DriverProfile;
