import React from 'react';
import { 
  LayoutDashboard, MapPin, Users, AlertTriangle, 
  Car, Compass, History, ShieldCheck, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AdminAuthContext';

const PesoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M7 4h7a5 5 0 0 1 0 10H7V4z" />
    <path d="M7 14v7" />
    <line x1="4" y1="8" x2="17" y2="8" />
    <line x1="4" y1="11" x2="17" y2="11" />
  </svg>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingDriverCount: number;
  openComplaintCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, pendingDriverCount, openComplaintCount 
}) => {
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'fare-matrix', label: 'Fare Matrix', icon: PesoIcon },
    { id: 'drivers', label: 'Driver Approvals', icon: ShieldCheck },
    { id: 'passengers', label: 'Passenger Directory', icon: Users },
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
    { id: 'bookings', label: 'Ride Audit', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#f7f9fb] dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-50 select-none">
      {/* Stitch TransitAdmin Brand Header */}
      <div className="p-6 mb-2 flex items-center gap-3">
        <span className="text-[#276efe] text-3xl shrink-0 flex items-center justify-center">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#276efe] tracking-tight leading-tight truncate">
            TransitAdmin
          </h1>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
            Municipal System
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-200 cursor-pointer ${
                isActive
                  ? 'border-l-4 border-[#276efe] font-bold text-[#276efe] bg-[#276efe]/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#276efe]' : 'text-slate-500'} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Stitch System Alert Button & Quick Links */}
      <div className="px-4 mt-auto space-y-4 pb-6">
        <button
          onClick={() => alert('All systems operational. Municipal tariff rate enforcement is ACTIVE.')}
          className="w-full bg-[#ba1a1a] hover:bg-[#a31515] text-white text-xs font-semibold py-2.5 rounded-full flex items-center justify-center gap-2 transition-opacity cursor-pointer shadow-sm active:scale-98"
        >
          <span>▲</span>
          <span>System Alert</span>
        </button>

        <div className="border-t border-slate-200/80 dark:border-slate-800 pt-3 space-y-1">
          <button
            onClick={() => setActiveTab('audit-logs')}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <span className="text-base">⚙️</span>
            <span>Settings</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
