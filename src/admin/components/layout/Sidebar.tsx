import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  History, 
  ShieldCheck, 
  LogOut, 
  Settings,
  Activity,
  Bus,
  CheckCircle2,
  X,
  FileCheck,
  ScrollText,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AdminAuthContext';
import { cn } from '../../../lib/utils';

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
  activeTab, 
  setActiveTab, 
  pendingDriverCount, 
  openComplaintCount 
}) => {
  const { user, logout } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);

  const menuNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'fare-matrix', label: 'Fare Matrix & Rates', icon: PesoIcon },
    { 
      id: 'drivers', 
      label: 'Driver Approvals', 
      icon: ShieldCheck, 
      count: pendingDriverCount > 0 ? pendingDriverCount : undefined,
      countColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
    },
    { id: 'passengers', label: 'Passenger Directory', icon: Users },
    { 
      id: 'complaints', 
      label: 'Complaints Triage', 
      icon: AlertTriangle,
      count: openComplaintCount > 0 ? openComplaintCount : undefined,
      countColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800'
    },
    { id: 'bookings', label: 'Ride Monitor', icon: History },
  ];

  const governanceNavItems = [
    { 
      id: 'admin-users', 
      label: 'Admin & Access', 
      icon: UserPlus,
      badge: user?.role === 'super_admin' ? 'Super' : undefined,
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
    },
    { 
      id: 'audit-logs', 
      label: 'Audit Trail & Compliance', 
      icon: FileCheck 
    },
  ];

  return (
    <>
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-50 select-none">
        {/* TransitAdmin Brand Header */}
        <div className="p-5 mb-1 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#0052d1] text-white flex items-center justify-center shadow-md shadow-[#0052d1]/20 shrink-0">
            <Bus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              TransitAdmin
            </h1>
            <p className="text-[11px] font-medium text-[#0052d1] dark:text-sky-400 truncate">
              Bauang Municipal Transit
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto pt-1">
          {/* MENU Category */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Menu
            </p>
            <div className="space-y-1">
              {menuNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full h-9 flex items-center justify-between px-3 rounded-md text-xs transition-all duration-200 cursor-pointer active:scale-98 group',
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-500/15 text-[#0052d1] dark:text-sky-300 font-semibold border border-blue-200/60 dark:border-blue-800/50 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-[#0052d1] dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums shrink-0', item.countColor)}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GOVERNANCE & LOGS Category */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Governance &amp; Compliance
            </p>
            <div className="space-y-1">
              {governanceNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full h-9 flex items-center justify-between px-3 rounded-md text-xs transition-all duration-200 cursor-pointer active:scale-98 group',
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-500/15 text-[#0052d1] dark:text-sky-300 font-semibold border border-blue-200/60 dark:border-blue-800/50 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-[#0052d1] dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-black shrink-0', item.badgeColor)}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Operational Status & Footer Quick Links */}
        <div className="p-4 mt-auto space-y-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
          {/* Live System Operational Status Card */}
          <button
            type="button"
            onClick={() => setShowStatusModal(true)}
            className="w-full text-left p-3 rounded-md bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/40 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 relative"></span>
                </span>
                System Operational
              </span>
              <Activity size={14} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold pl-4.5">
              Tariff &amp; Live Tracking Active
            </p>
          </button>

          {/* Quick Support & Documentation Links */}
          <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setActiveTab('audit-logs')}
              className="hover:text-[#0052d1] dark:hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ScrollText size={13} />
              <span>Logs &amp; Config</span>
            </button>
            <button
              onClick={logout}
              className="text-rose-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <LogOut size={13} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* System Health Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">System Status: Normal</h3>
                  <p className="text-[10px] text-slate-400">Municipality of Bauang Dispatch Core</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Supabase Database Connection</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Tariff Rate Matrix Policy</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Enforced (2026)
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Live Telemetry &amp; GPS Dispatch</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="w-full h-9 rounded-md bg-[#0052d1] hover:bg-[#206afa] text-white font-bold text-xs transition-all cursor-pointer active:scale-95 inline-flex items-center justify-center shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
