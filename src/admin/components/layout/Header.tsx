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
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      {/* Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '380px' }}>
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14 }} />
        <input
          type="text"
          placeholder="Global search drivers, bookings, complaints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: 42, background: 'var(--bg-surface)' }}
        />
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Live DB Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 9999,
          background: 'var(--success-bg)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          fontSize: '0.75rem',
          fontWeight: 700
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span>
          <span>LIVE DB CONNECTED</span>
        </div>

        {/* Sync / Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary btn-sm"
          title="Refresh & Sync Data"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} />}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn btn-secondary btn-sm"
            style={{ position: 'relative', padding: 8 }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: 'var(--danger)',
                color: '#fff',
                borderRadius: '50%',
                width: 16,
                height: 16,
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="glass-card"
              style={{
                position: 'absolute',
                top: 46,
                right: 0,
                width: 340,
                maxHeight: 400,
                overflowY: 'auto',
                zIndex: 100,
                padding: 12,
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Notifications ({unreadCount})</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => notifications.forEach(n => markAsRead(n.id))}>
                  Mark all read
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No new alerts or complaints.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: n.read ? 'transparent' : 'var(--accent-glow)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {n.type === 'complaint' && <AlertCircle size={16} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} />}
                      {n.type === 'driver_verification' && <ShieldCheck size={16} color="var(--warning)" style={{ marginTop: 2, flexShrink: 0 }} />}
                      {n.type === 'system' && <CheckCircle size={16} color="var(--success)" style={{ marginTop: 2, flexShrink: 0 }} />}
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: n.read ? 600 : 700 }}>{n.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
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
      </div>
    </header>
  );
};
