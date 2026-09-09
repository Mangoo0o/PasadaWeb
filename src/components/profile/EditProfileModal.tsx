import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Phone, 
  GraduationCap, 
  HeartHandshake, 
  Accessibility, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Loader2,
  Percent
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getPassengerTypeInfo } from '../../services/fareService';
import { cn } from '../../lib/utils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [passengerType, setPassengerType] = useState<'regular' | 'student' | 'senior' | 'pwd'>('regular');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync state whenever modal opens or user updates
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setPhoneNumber(user.phone_number || '');
      const currentType = (user.passenger_type || localStorage.getItem('pasada_discount_type') || 'regular') as any;
      setPassengerType(currentType);
      setErrorMsg(null);
      setShowSuccess(false);
    }
  }, [isOpen, user]);

  const PASSENGER_TYPE_OPTIONS = [
    {
      id: 'regular',
      label: i18n.language === 'en' ? 'Regular Passenger' : 'Regular na Pasahero',
      sublabel: i18n.language === 'en' ? 'Standard municipal tariff' : 'Standard na taripa ng munisipyo',
      icon: User,
      badge: null,
      discount: false,
    },
    {
      id: 'student',
      label: i18n.language === 'en' ? 'Student / Estudyante' : 'Estudyante (Student)',
      sublabel: i18n.language === 'en' ? 'Requires valid school ID' : 'Kailangan ng valid na School ID',
      icon: GraduationCap,
      badge: '-20% OFF',
      discount: true,
    },
    {
      id: 'senior',
      label: i18n.language === 'en' ? 'Senior Citizen' : 'Senior Citizen (60+)',
      sublabel: i18n.language === 'en' ? 'Requires valid OSCA ID' : 'Kailangan ng Senior OSCA ID',
      icon: HeartHandshake,
      badge: '-20% OFF',
      discount: true,
    },
    {
      id: 'pwd',
      label: i18n.language === 'en' ? 'Person with Disability (PWD)' : 'May Kapansanan (PWD)',
      sublabel: i18n.language === 'en' ? 'Requires official PWD card' : 'Kailangan ng opisyal na PWD Card',
      icon: Accessibility,
      badge: '-20% OFF',
      discount: true,
    },
  ] as const;

  const isDiscountEligible = passengerType !== 'regular';
  const activeTypeInfo = getPassengerTypeInfo(passengerType);
  const isFormValid = fullName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMsg(i18n.language === 'en' ? 'Please enter your full name.' : 'Paki-lagay ang iyong buong pangalan.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserProfile({
        full_name: trimmedName,
        phone_number: phoneNumber.trim(),
        passenger_type: passengerType,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(
        err.message || 
        (i18n.language === 'en' ? 'Failed to save profile changes.' : 'Hindi ma-save ang mga pagbabago. Pakisubukang muli.')
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
              {t('profile.editProfile', 'I-edit ang Profile')}
            </h3>
            <p className="text-[11px] text-slate-500 font-normal">
              {t('profile.editProfileSub', 'I-update ang impormasyon at uri ng diskwento sa taripa')}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
        
        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Notice */}
        {showSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('profile.profileUpdated', 'Matagumpay na na-update ang iyong profile!')}</span>
          </div>
        )}

        {/* 1. Full Name Input */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('profile.fullName', 'Buong Pangalan')} <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Dela Cruz"
              required
              className={cn(
                'w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all',
                'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white',
                'focus:ring-2 focus:ring-[#0052d1] focus:bg-white dark:focus:bg-slate-800'
              )}
            />
          </div>
        </div>

        {/* 2. Phone Number Input */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('profile.phoneNumber', 'Numero ng Telepono')}
          </label>
          <div className="relative flex items-center">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0912 345 6789"
              className={cn(
                'w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all',
                'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white',
                'focus:ring-2 focus:ring-[#0052d1] focus:bg-white dark:focus:bg-slate-800'
              )}
            />
          </div>
        </div>

        {/* 3. Commuter Classification Selection */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('profile.passengerTypeLabel', 'Uri ng Pasahero / Diskwento sa Taripa')}
            </label>
            {isDiscountEligible && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                <Percent className="w-2.5 h-2.5" />
                <span>20% Diskwento Aktibo</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PASSENGER_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = passengerType === opt.id;

              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPassengerType(opt.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-2.5 relative',
                    isSelected
                      ? 'border-[#0052d1] bg-[#0052d1]/5 dark:bg-[#0052d1]/15 ring-2 ring-[#0052d1]/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/60'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                      isSelected
                        ? 'bg-[#0052d1] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {opt.sublabel}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 text-[#0052d1] dark:text-sky-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Simple ID Reminder for Discounted types */}
        {isDiscountEligible && (
          <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in">
            <span className="shrink-0 text-xs">🪪</span>
            <span>
              {i18n.language === 'en'
                ? `Reminder: Please carry your valid ${activeTypeInfo.label} ID during each ride for driver verification.`
                : `Paalala: Pakihanda ang iyong valid na ${activeTypeInfo.label} ID sa bawat biyahe upang maipakita kay Manong Driver.`}
            </span>
          </div>
        )}

        {/* 4. Modal Footer Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
              'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {t('profile.cancel', 'Kanselahin')}
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className={cn(
              'px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5',
              isFormValid && !isSubmitting
                ? 'bg-[#0052d1] hover:bg-[#206afa] text-white shadow-[#0052d1]/20 cursor-pointer active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{i18n.language === 'en' ? 'Saving...' : 'Sine-save...'}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-[#fcd400]" />
                <span>{t('profile.saveChanges', 'I-save ang mga Pagbabago')}</span>
              </>
            )}
          </button>
        </div>

      </form>
    </Modal>
  );
};
