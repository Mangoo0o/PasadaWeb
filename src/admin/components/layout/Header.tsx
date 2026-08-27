import React, { useState } from 'react';
import { Sun, Moon, Bell, Search, ShieldCheck, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { NotificationItem } from '../../types';

interface HeaderProps {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefreshData?: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({ 
  notifications, markAsRead, searchQuery, setSearchQuery, onRefreshData
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Stitch Rounded Search Input */}
      <div className="flex items-center relative w-72 md:w-96">
        <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search routes, fares..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-[#f2f4f6] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-full text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-[#276efe] focus:ring-2 focus:ring-[#276efe]/20 outline-none transition-all"
        />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Stitch Sensors Telemetry Indicator */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer flex items-center justify-center"
          title="Sensors & Live Telemetry"
        >
          <span className="text-sm font-black tracking-tighter">((•))</span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer flex items-center justify-center"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer flex items-center justify-center relative"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full border border-white dark:border-slate-900"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 max-h-96 overflow-y-auto z-50 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white">Notifications ({unreadCount})</span>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[#0052d1] hover:underline cursor-pointer"
                  onClick={() => notifications.forEach(n => markAsRead(n.id))}
                >
                  Mark all read
                </button>
              </div>

              <div className="space-y-1.5">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-medium">
                    No new alerts or complaints.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        n.read 
                          ? 'bg-slate-50/50 dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-400' 
                          : 'bg-sky-50/60 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900 text-slate-900 dark:text-white'
                      }`}
                    >
                      {n.type === 'complaint' && <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />}
                      {n.type === 'driver_verification' && <ShieldCheck size={15} className="text-amber-500 shrink-0 mt-0.5" />}
                      {n.type === 'system' && <CheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" />}
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{n.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.message}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stitch User Profile Avatar */}
        <div className="ml-1 w-8 h-8 rounded-full bg-[#206afa] text-white flex items-center justify-center shadow-xs cursor-pointer hover:ring-2 hover:ring-[#206afa]/30 transition-all">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>
    </header>
  );
};
