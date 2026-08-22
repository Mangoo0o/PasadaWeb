import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Compass, 
  History, 
  ShieldCheck, 
  Navigation,
  User,
  LayoutDashboard
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
        { id: 'driver', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'dispatch', label: 'Dispatch', icon: Navigation },
        { id: 'history', label: 'History', icon: History },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    }
    if (user?.role === 'admin') {
      return [
        { id: 'admin', label: 'Admin Suite', icon: ShieldCheck },
        { id: 'home', label: 'Passenger App', icon: Bike },
        { id: 'history', label: 'History', icon: History },
      ];
    }
    return [
      { id: 'home', label: 'Pasada', icon: Bike },
      { id: 'tourist', label: 'Explore', icon: Compass },
      { id: 'history', label: 'History', icon: History },
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.1)] rounded-t-3xl px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] border-t border-outline-variant/10">
      <div className="max-w-xl mx-auto flex justify-around items-center h-[58px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-all active:scale-95 group min-w-0 ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {isActive ? (
                <div className="bg-secondary-container text-on-secondary-container rounded-full px-3.5 sm:px-5 py-1 flex items-center justify-center mb-0.5 shadow-sm transition-all">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              ) : (
                <div className="px-3.5 sm:px-5 py-1 flex items-center justify-center mb-0.5">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
                </div>
              )}
              <span className={`text-[10px] sm:text-[11px] truncate max-w-[70px] ${isActive ? 'font-black text-primary' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
