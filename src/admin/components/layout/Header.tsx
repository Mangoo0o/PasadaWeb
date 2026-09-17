import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Bell, 
  Search, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  User, 
  X,
  Menu,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AdminAuthContext';
import type { NotificationItem } from '../../types';
import { cn } from '../../../lib/utils';

interface HeaderProps {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefreshData?: () => Promise<void>;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  notifications, 
  markAsRead, 
  searchQuery, 
  setSearchQuery, 
  onRefreshData,
  onToggleSidebar
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRefresh = async () => {
    if (!onRefreshData || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left Section: Sidebar Toggle & Modernized Search Bar */}
      <div className="flex items-center gap-3">
        {/* Mobile-only Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Toggle Navigation"
            aria-label="Toggle Navigation"
          >
            <Menu size={17} />
          </button>
        )}

        {/* Search Input with TailAdmin Command Shortcut Pill */}
        <div className="flex items-center relative w-72 md:w-96">
          <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search or type command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-9 pl-9 pr-14 bg-slate-50/90 dark:bg-slate-800/80 border text-xs font-normal outline-none transition-all rounded-md',
              'border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400',
              'focus:bg-white dark:focus:bg-slate-900 focus:border-[#0052d1] focus:ring-1 focus:ring-[#0052d1]/20 shadow-2xs'
            )}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Clear filter"
            >
              <X size={13} />
            </button>
          ) : (
            <div className="absolute right-2.5 pointer-events-none flex items-center gap-0.5">
              <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Controls & Profile Pill */}
      <div className="flex items-center gap-2">
        {/* Live Data Sync / Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'w-9 h-9 text-slate-500 hover:text-[#0052d1] dark:text-slate-400 dark:hover:text-sky-400 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center',
            isRefreshing && 'opacity-70 pointer-events-none'
          )}
          title={isRefreshing ? 'Refreshing Data...' : 'Refresh Live Fleet & Fares Data'}
          aria-label="Refresh Data"
        >
          <RefreshCw size={15} className={cn('transition-transform duration-500', isRefreshing && 'animate-spin text-[#0052d1] dark:text-sky-400')} />
        </button>

        {/* Dark/Light Mode Toggle (TailAdmin style) */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              'w-9 h-9 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center relative',
              showNotifications && 'bg-slate-100 dark:bg-slate-800 text-[#0052d1]'
            )}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 max-h-96 overflow-y-auto z-50 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-xl space-y-2 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#0052d1] dark:text-sky-400 hover:underline cursor-pointer"
                    onClick={() => notifications.forEach(n => markAsRead(n.id))}
                  >
                    Mark all read
                  </button>
                )}
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
                      className={cn(
                        'p-2.5 rounded-md border transition-colors cursor-pointer flex items-start gap-2.5',
                        n.read 
                          ? 'bg-slate-50/50 dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-400' 
                          : 'bg-sky-50/60 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900 text-slate-900 dark:text-white'
                      )}
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

        {/* User Profile Pill with Avatar & Name */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={cn(
              'flex items-center gap-2.5 p-1 pl-1 pr-2.5 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all',
              showProfileMenu && 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            )}
            title="Admin Account Details"
            aria-label="Admin Profile Menu"
          >
            <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-[#0052d1] to-[#206afa] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight truncate max-w-[120px]">
                {user?.full_name || 'Admin'}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {showProfileMenu && (
            <div className="absolute top-12 right-0 w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-md bg-[#0052d1] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.full_name || 'LGU Super Admin'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || 'admin@bauang.gov.ph'}
                  </p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-300">
                    Municipal Admin
                  </span>
                </div>
              </div>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full h-9 px-3 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                >
                  <LogOut size={14} />
                  <span>Sign Out of Admin</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

