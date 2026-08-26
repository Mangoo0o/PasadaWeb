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
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <nav 
        className="bg-[#0052d1]/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[36px] sm:rounded-[44px] p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2.5 shadow-[0_12px_40px_rgba(0,82,209,0.42)] border border-white/30"
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
              className={`h-11 sm:h-12 px-4 sm:px-5 flex items-center justify-center gap-2 rounded-full transition-all active:scale-95 cursor-pointer ${
                isActive 
                  ? 'bg-white text-[#0052d1] shadow-lg font-black' 
                  : 'text-white/85 hover:text-white hover:bg-white/15 font-bold'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#0052d1]' : 'text-white'}`} />
              <span className={`text-xs sm:text-sm font-extrabold ${isActive ? 'inline-block text-[#0052d1]' : 'hidden sm:inline-block text-white/90'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
