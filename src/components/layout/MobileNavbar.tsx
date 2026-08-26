import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Compass, 
  History, 
  ShieldCheck, 
  Navigation, 
  User, 
  LayoutDashboard, 
  MapPin, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MobileNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const getTabs = () => {
    if (user?.role === 'driver') {
      return [
        { id: 'driver', label: t('nav.driverPortal', 'Dashboard'), icon: LayoutDashboard },
        { id: 'dispatch', label: 'Dispatch', icon: Navigation },
        { id: 'history', label: t('nav.history', 'History'), icon: History },
        { id: 'profile', label: t('nav.profile', 'Profile'), icon: User },
      ];
    }
    if (user?.role === 'admin') {
      return [
        { id: 'admin', label: t('nav.admin', 'Admin'), icon: ShieldCheck },
        { id: 'home', label: t('nav.explore', 'Explore'), icon: Compass },
        { id: 'pasada', label: t('nav.pasada', 'Pasada'), icon: Bike },
        { id: 'history', label: t('nav.history', 'History'), icon: History },
        { id: 'profile', label: t('nav.profile', 'Profile'), icon: User },
      ];
    }
    // Passenger Tabs: Explore (Home), Pasada (Ride & Map), Profile (Account, History Hub & Safety)
    return [
      { id: 'home', label: t('nav.explore', 'Explore'), icon: Compass },
      { id: 'pasada', label: t('nav.pasada', 'Pasada'), icon: Bike },
      { id: 'profile', label: t('nav.profile', 'Profile'), icon: User },
    ];
  };

  const tabs = getTabs();

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
      <nav 
        className="bg-[#0052d1]/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[36px] sm:rounded-[44px] p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 shadow-[0_12px_40px_rgba(0,82,209,0.42)] border border-white/30 transition-all duration-300 ease-out"
        role="navigation"
        aria-label="Main Navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'profile' && activeTab === 'history' && user?.role === 'passenger');

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              title={tab.label}
              className={`relative h-11 sm:h-12 px-3.5 sm:px-5 flex items-center justify-center gap-1.5 sm:gap-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 select-none cursor-pointer overflow-hidden ${
                isActive 
                  ? 'bg-white text-[#0052d1] shadow-[0_6px_20px_rgba(0,0,0,0.15)] font-black scale-102 sm:scale-105' 
                  : 'text-white/80 hover:text-white hover:bg-white/15 font-bold'
              }`}
            >
              <Icon 
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0 ${
                  isActive ? 'text-[#0052d1] scale-110 -translate-y-0.5' : 'text-white scale-100'
                }`} 
              />
              <span 
                className={`text-xs sm:text-sm font-extrabold transition-all duration-300 ease-out whitespace-nowrap ${
                  isActive 
                    ? 'inline-block text-[#0052d1] opacity-100 translate-x-0' 
                    : 'hidden sm:inline-block text-white/90 opacity-80'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
