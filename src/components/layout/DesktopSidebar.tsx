import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Navigation, 
  Bike, 
  Compass, 
  History, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface DesktopSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Pasada (Booking)', icon: Bike, desc: 'Bauang Map & Smart Fare' },
    { id: 'tourist', label: 'Explore (Tourism)', icon: Compass, desc: 'Vineyards & Beaches' },
    { id: 'history', label: 'History (Receipts)', icon: History, desc: 'Digital Receipts & Ratings' },
    { id: 'driver', label: 'Driver Dashboard', icon: Navigation, desc: 'Queue & Turn-by-Turn' },
    { id: 'admin', label: 'Bauang TODA Admin', icon: ShieldCheck, desc: 'Fare Matrix & Oversight' },
  ];

  return (
    <div className="h-full flex flex-col justify-between p-4 bg-surface-container-low/40">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant px-3 mb-2">
            Bauang Smart Transit
          </div>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all ${
                    isActive
                      ? 'bg-primary text-on-primary font-bold shadow-md shadow-primary/20'
                      : 'text-on-surface hover:bg-surface-container font-medium'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-secondary-container' : 'text-primary'}`} />
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <div className={`text-[11px] ${isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TODA Terminal Status Box */}
        <div className="bg-surface-container rounded-2xl p-4 text-xs border border-surface-container-highest shadow-sm">
          <div className="flex items-center gap-2 font-extrabold text-primary mb-1">
            <Layers className="w-4 h-4 text-secondary" />
            <span>Bauang Municipal Transit</span>
          </div>
          <div className="text-on-surface-variant text-[11px]">
            Base Fare: <span className="font-bold text-on-surface">₱20.00 (First 2 km)</span>
          </div>
          <div className="text-on-surface-variant text-[11px]">
            Excess Distance: <span className="font-bold text-on-surface">+₱5.00 / km</span>
          </div>
          <div className="mt-2 text-[10px] text-tertiary font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-secondary-container inline-block animate-pulse"></span>
            Regulated Taripa Active
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-surface-container-highest text-[11px] text-on-surface-variant flex items-center justify-between px-2">
        <span>PasadaGuide Bauang</span>
        <span className="text-primary font-bold">LGU MITO</span>
      </div>
    </div>
  );
};
