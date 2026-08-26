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
  const activeIndex = tabs.findIndex(
    (tab) => tab.id === activeTab || (tab.id === 'profile' && activeTab === 'history' && user?.role === 'passenger')
  );
  const validIndex = activeIndex >= 0 ? activeIndex : 0;
  const totalTabs = tabs.length;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-[95vw]">
      <nav 
        className="relative bg-[#0052d1]/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[36px] sm:rounded-[44px] p-1.5 grid grid-flow-col auto-cols-fr shadow-[0_12px_40px_rgba(0,82,209,0.42)] border border-white/30"
        role="tablist"
        aria-label="Main Navigation Toggle"
      >
        {/* Sliding Capsule Toggle Indicator */}
        <div 
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full bg-white shadow-[0_4px_18px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0"
          style={{
            width: `calc((100% - 12px) / ${totalTabs})`,
            transform: `translateX(calc(${validIndex} * 100%))`,
          }}
        />

        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = idx === validIndex;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              title={tab.label}
              className="relative z-10 h-11 sm:h-12 w-full min-w-[88px] sm:min-w-[115px] px-2.5 sm:px-4 flex items-center justify-center gap-1.5 rounded-full select-none cursor-pointer active:scale-95 transition-all duration-200"
            >
              <Icon 
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0 ${
                  isActive 
                    ? 'text-[#0052d1] scale-110' 
                    : 'text-white/80 hover:text-white scale-100'
                }`} 
              />
              <span 
                className={`text-[11px] sm:text-xs font-black transition-colors duration-200 whitespace-nowrap leading-none ${
                  isActive 
                    ? 'text-[#0052d1] inline-block' 
                    : 'text-white/80 hover:text-white hidden sm:inline-block font-bold'
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
