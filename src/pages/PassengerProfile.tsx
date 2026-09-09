import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  Heart, 
  Bike, 
  Globe, 
  CheckCircle2, 
  Percent, 
  History,
  Compass,
  ChevronRight,
  Clock,
  MessageSquareWarning,
  MapPin,
  Edit3,
  Scale
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Booking } from '../types/database.types';
import { fetchUserBookings } from '../services/bookingService';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { getPassengerTypeInfo } from '../services/fareService';
import { WatermelonAccordion } from '../components/ui/WatermelonAccordion';
import { cn } from '../lib/utils';

interface PassengerProfileProps {
  setActiveTab?: (tab: string) => void;
}

export const PassengerProfile: React.FC<PassengerProfileProps> = ({ setActiveTab }) => {
  const { t, i18n } = useTranslation();
  const { user, signOut, setLanguage, updateUserProfile } = useAuth();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Single source of truth: user.passenger_type with localStorage fallback
  const [discountType, setDiscountType] = useState<string>(() => {
    return user?.passenger_type || localStorage.getItem('pasada_discount_type') || 'regular';
  });

  useEffect(() => {
    if (user?.passenger_type) {
      setDiscountType(user.passenger_type);
      localStorage.setItem('pasada_discount_type', user.passenger_type);
    }
    const handleDiscountUpdate = (e: any) => {
      const updatedType = e.detail || localStorage.getItem('pasada_discount_type');
      if (updatedType) setDiscountType(updatedType);
    };
    window.addEventListener('pasada_discount_changed', handleDiscountUpdate);
    return () => window.removeEventListener('pasada_discount_changed', handleDiscountUpdate);
  }, [user?.passenger_type]);

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
      
      {/* 1. Header Bar styled matching the search card */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-full p-2 sm:p-2.5 px-3.5 sm:px-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0052d1] text-white flex items-center justify-center shadow-md shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#fcd400]" />
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
          {/* Functional Language Switch with Account Sync - Taller matching search card */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3.5 h-[38px] sm:h-[40px] rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300 hover:bg-slate-200 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 active:scale-95"
            title="Switch Language / Magpalit ng Wika"
          >
            <Globe className="w-3.5 h-3.5 text-[#0052d1]" />
            <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
          </button>

          {/* Sign Out - Taller matching search card */}
          <button
            onClick={signOut}
            className="h-[38px] sm:h-[40px] px-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shadow-xs cursor-pointer active:scale-95 flex items-center justify-center"
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
            {isDiscountEligible ? (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-0.5">
                <Percent className="w-2.5 h-2.5" />
                {getPassengerTypeInfo(discountType).label} (-20%)
              </span>
            ) : (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Regular Taripa
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

        {/* Edit Profile Action Button */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className={cn(
            'h-9 px-3 sm:px-3.5 rounded-full font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 z-10',
            'bg-[#0052d1]/10 hover:bg-[#0052d1]/20 text-[#0052d1] dark:text-sky-300 border border-[#0052d1]/20 active:scale-95'
          )}
          title={t('profile.editProfile', 'I-edit ang Profile')}
        >
          <Edit3 className="w-3.5 h-3.5 text-[#0052d1] dark:text-sky-400" />
          <span className="hidden xs:inline">{t('profile.editProfile', 'Edit Profile')}</span>
        </button>
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

      {/* 4. Commuter Classification & Municipal Tariff Status Card */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center',
              isDiscountEligible
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400'
            )}>
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#191c1e] dark:text-white">
                {t('profile.currentTariffStatus', 'Kasalukuyang Katayuan sa Taripa')}
              </h3>
              <p className="text-[10px] text-slate-500">
                {t('profile.ordinanceSubtitle', 'Batas Republika 10754, 9994, 10687')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-[#0052d1] hover:text-[#206afa] dark:text-sky-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0052d1]/10 hover:bg-[#0052d1]/15 dark:bg-sky-500/10 cursor-pointer transition-colors border border-[#0052d1]/20 active:scale-95"
            title={t('profile.editProfile', 'I-edit ang Profile at Diskwento')}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('profile.editProfile', 'I-edit')}</span>
          </button>
        </div>

        {/* Current Active Status Card */}
        <div className={cn(
          'p-3 rounded-xl border flex items-center justify-between gap-3',
          isDiscountEligible
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold',
              isDiscountEligible ? 'bg-emerald-600 shadow-sm' : 'bg-[#0052d1] shadow-sm'
            )}>
              {isDiscountEligible ? <CheckCircle2 className="w-4 h-4 text-[#fcd400]" /> : <User className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {getPassengerTypeInfo(discountType).label}
                </span>
                {isDiscountEligible ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                    -20% OFF
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Standard Tariff
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isDiscountEligible
                  ? (i18n.language === 'en' ? 'Statutory 20% municipal tariff discount active' : 'Aktibong 20% diskwento sa taripa ng munisipyo')
                  : (i18n.language === 'en' ? 'Standard municipal fare rate' : 'Standard na taripa ng munisipyo')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-[11px] font-bold text-[#0052d1] dark:text-sky-400 hover:underline shrink-0 cursor-pointer"
          >
            {i18n.language === 'en' ? 'Change' : 'Palitan'} →
          </button>
        </div>

        {/* Watermelon UI Animated Accordion for Ordinance & ID Inspection Rules */}
        <WatermelonAccordion
          items={[
            {
              id: 'ordinance-rules',
              title: i18n.language === 'en' ? 'Municipal Ordinance & Discount Rules' : 'Ordinansa sa Taripa at Alituntunin sa Diskwento',
              subtitle: i18n.language === 'en' ? 'Legal statutory discounts for Bauang commuters' : 'Opisyal na diskwento ayon sa batas ng munisipyo',
              icon: Scale,
              badge: 'LEGAL',
              content: (
                <div className="space-y-1.5 text-[11px]">
                  <p>
                    {i18n.language === 'en'
                      ? 'In accordance with Republic Acts 10754 (Persons with Disabilities), 9994 (Expanded Senior Citizens Act), and 10687 (Student Fare Discount Act), eligible commuters are entitled to a 20% discount on tricycle tariffs in the Municipality of Bauang.'
                      : 'Alinsunod sa Batas Republika 10754 (PWD), 9994 (Senior Citizens), at 10687 (Student Fare), ang mga kwalipikadong pasahero ay may 20% diskwento sa taripa ng traysikel sa Bauang.'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                    {t('profile.manageDiscountInEdit', 'Upang palitan ang iyong uri ng taripa, i-click ang I-edit ang Profile sa itaas upang makumpleto ang kinakailangang beripikasyon.')}
                  </p>
                </div>
              ),
            },
            {
              id: 'id-inspection',
              title: i18n.language === 'en' ? 'Driver Physical ID Inspection Protocol' : 'Protokol sa Pagpapakita ng ID kay Driver',
              subtitle: i18n.language === 'en' ? 'Accepted IDs upon boarding' : 'Mga tinatanggap na valid ID',
              icon: ShieldCheck,
              badge: 'REQUIRED',
              content: (
                <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                  <li><strong>{i18n.language === 'en' ? 'Students:' : 'Estudyante:'}</strong> {i18n.language === 'en' ? 'Valid school/university ID for the current semester.' : 'Kasalukuyang School ID para sa aktibong school year/semester.'}</li>
                  <li><strong>{i18n.language === 'en' ? 'Senior Citizens:' : 'Senior Citizen:'}</strong> {i18n.language === 'en' ? 'Official OSCA identification card.' : 'Opisyal na OSCA ID Card mula sa LGU.'}</li>
                  <li><strong>{i18n.language === 'en' ? 'PWDs:' : 'May Kapansanan (PWD):'}</strong> {i18n.language === 'en' ? 'Valid DOH / NCDA / LGU PWD identification card.' : 'Opisyal na PWD ID Card mula sa Munisipyo / PDAO.'}</li>
                  <li className="text-emerald-700 dark:text-emerald-400 font-medium">{i18n.language === 'en' ? 'Note: Drivers have the right to request full fare if no valid ID can be presented upon request.' : 'Paalala: May karapatan si Manong Driver na maningil ng regular na taripa kung walang maipakitang valid ID.'}</li>
                </ul>
              ),
            },
          ]}
        />
      </section>

      {/* 5. Sign Out Button */}
      <div className="pt-1">
        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('profile.signOut')}</span>
        </button>
      </div>

      {/* Edit Profile & Commuter Classification Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

    </div>
  );
};
