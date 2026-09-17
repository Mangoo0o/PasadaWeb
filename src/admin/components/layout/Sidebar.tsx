import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  History, 
  ShieldCheck, 
  LogOut, 
  Activity, 
  Bus, 
  CheckCircle2, 
  X, 
  FileCheck, 
  ScrollText, 
  UserPlus,
  ChevronLeft
} from 'lucide-react';
import { SidebarLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion, AnimatePresence } from 'motion/react';
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  pendingDriverCount, 
  openComplaintCount,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { user, logout } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

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
      {/* Watermelon UI macOS-Style Spring Animated Sidebar */}
      <motion.aside
        animate={{
          width: isCollapsed ? 72 : 256
        }}
        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-50 select-none shrink-0 relative"
      >
        {/* Circular Arrow Collapse Button on the Edge of the Navbar */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
            title={isCollapsed ? "Expand Navigation Bar" : "Collapse Navigation Bar"}
            aria-label={isCollapsed ? "Expand Navigation Bar" : "Collapse Navigation Bar"}
          >
            <ChevronLeft size={13} className={cn("transition-transform duration-300", isCollapsed && "rotate-180")} />
          </button>
        )}

        {/* Brand Header: Logo always shows up! */}
        <div className={cn(
          "h-16 flex items-center border-b border-slate-200/80 dark:border-slate-800 transition-all shrink-0",
          isCollapsed ? "justify-center px-2" : "px-4 gap-2.5"
        )}>
          <div className="w-8 h-8 rounded-md bg-[#0052d1] text-white flex items-center justify-center shadow-xs shrink-0">
            <Bus className="w-4.5 h-4.5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                PasadaGuide
              </h1>
              <p className="text-[10px] font-medium text-[#0052d1] dark:text-sky-400 truncate">
                Bauang Municipal Transit
              </p>
            </div>
          )}
        </div>

        {/* Navigation Links with Tactile Selection & Spring Hover Morphing */}
        <nav 
          className={cn("flex-1 space-y-4 overflow-y-auto overflow-x-hidden pt-2", isCollapsed ? "px-2" : "px-3")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          {/* MENU Category */}
          <div>
            {!isCollapsed ? (
              <p className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Menu
              </p>
            ) : (
              <div className="my-2 mx-2 border-t border-slate-200/60 dark:border-slate-800" />
            )}
            <div className="space-y-1">
              {menuNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isHovered = hoveredTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      'h-9 rounded-md text-xs transition-colors cursor-pointer active:scale-98 group relative',
                      isCollapsed
                        ? 'w-10 mx-auto flex items-center justify-center'
                        : 'w-full flex items-center justify-between px-3',
                      isActive
                        ? 'text-[#0052d1] dark:text-sky-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                    )}
                  >
                    {/* Active tactile selection pill */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 z-0 bg-blue-50/90 dark:bg-blue-500/15 border border-blue-200/70 dark:border-blue-800/60 rounded-md shadow-2xs"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* macOS Spring hover morphing background */}
                    <AnimatePresence>
                      {isHovered && !isActive && (
                        <motion.span
                          layoutId="sidebar-hover-pill"
                          className="absolute inset-0 z-0 bg-slate-100/90 dark:bg-slate-800/70 rounded-md"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>

                    <div className={cn("relative z-10 flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-[#0052d1] dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        )}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.count !== undefined && (
                      <span className={cn('relative z-10 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums shrink-0', item.countColor)}>
                        {item.count}
                      </span>
                    )}

                    {isCollapsed && item.count !== undefined && (
                      <span className="relative z-10 absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                    )}

                    {/* Floating macOS-style tooltip on hover when collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GOVERNANCE & LOGS Category */}
          <div>
            {!isCollapsed ? (
              <p className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Governance &amp; Compliance
              </p>
            ) : (
              <div className="my-2 mx-2 border-t border-slate-200/60 dark:border-slate-800" />
            )}
            <div className="space-y-1">
              {governanceNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isHovered = hoveredTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      'h-9 rounded-md text-xs transition-colors cursor-pointer active:scale-98 group relative',
                      isCollapsed
                        ? 'w-10 mx-auto flex items-center justify-center'
                        : 'w-full flex items-center justify-between px-3',
                      isActive
                        ? 'text-[#0052d1] dark:text-sky-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                    )}
                  >
                    {/* Active tactile selection pill */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 z-0 bg-blue-50/90 dark:bg-blue-500/15 border border-blue-200/70 dark:border-blue-800/60 rounded-md shadow-2xs"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* macOS Spring hover morphing background */}
                    <AnimatePresence>
                      {isHovered && !isActive && (
                        <motion.span
                          layoutId="sidebar-hover-pill"
                          className="absolute inset-0 z-0 bg-slate-100/90 dark:bg-slate-800/70 rounded-md"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>

                    <div className={cn("relative z-10 flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-[#0052d1] dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        )}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span className={cn('relative z-10 px-1.5 py-0.2 rounded text-[10px] font-black shrink-0', item.badgeColor)}>
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && item.badge !== undefined && (
                      <span className="relative z-10 absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                    )}

                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Operational Status & Footer Quick Links */}
        <div className={cn("mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40", isCollapsed ? "p-2.5 space-y-2" : "p-4 space-y-3")}>
          {/* Live System Operational Status Card */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              className="w-10 h-10 mx-auto rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center cursor-pointer transition-colors group relative"
              title="System Operational: Normal"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 relative" />
              </span>
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                System Operational
              </div>
            </button>
          ) : (
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
          )}

          {/* Quick Support & Documentation Links */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveTab('audit-logs')}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-[#0052d1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group relative"
                title="Logs & Config"
              >
                <ScrollText size={15} />
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Logs &amp; Config
                </div>
              </button>
              <button
                onClick={logout}
                className="w-8 h-8 rounded-md flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer group relative"
                title="Exit Console"
              >
                <LogOut size={15} />
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Exit
                </div>
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </motion.aside>

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
              className="w-full h-9 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
