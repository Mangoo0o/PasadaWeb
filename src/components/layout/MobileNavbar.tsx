import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Compass, 
  History, 
  ShieldCheck, 
  Navigation 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MobileNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const getDriverOrAdminTab = () => {
    if (user?.role === 'admin') return { id: 'admin', label: 'TODA Admin', icon: ShieldCheck };
    return { id: 'driver', label: 'Driver', icon: Navigation };
  };

  const driverTab = getDriverOrAdminTab();

  const tabs = [
    { id: 'home', label: 'Pasada', icon: Bike },
    { id: 'tourist', label: 'Explore', icon: Compass },
    { id: 'history', label: 'History', icon: History },
    driverTab,
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.1)] rounded-t-3xl px-2 py-1.5 border-t border-outline-variant/10">
      <div className="max-w-md mx-auto flex justify-around items-center h-[64px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-all active:scale-95 group ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {isActive ? (
                <div className="bg-secondary-container text-on-secondary-container rounded-full px-5 py-1 flex items-center justify-center mb-0.5 shadow-sm transition-all">
                  <Icon className="w-5 h-5" />
                </div>
              ) : (
                <div className="px-5 py-1 flex items-center justify-center mb-0.5">
                  <Icon className="w-5 h-5 text-on-surface-variant" />
                </div>
              )}
              <span className={`text-[11px] ${isActive ? 'font-black text-primary' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
