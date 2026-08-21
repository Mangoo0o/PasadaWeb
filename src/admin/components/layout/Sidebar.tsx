import React from 'react';
import { 
  LayoutDashboard, DollarSign, MapPin, Users, AlertTriangle, 
  Car, Compass, History, ShieldCheck, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AdminAuthContext';

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
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'fare-matrix', label: 'Fare Matrix & Rates', icon: DollarSign },
    { id: 'terminals', label: 'Locations & Terminals', icon: MapPin },
    { 
      id: 'drivers', 
      label: 'Driver Approvals', 
      icon: Car, 
      badge: pendingDriverCount > 0 ? pendingDriverCount : undefined, 
      badgeType: 'warning' 
    },
    { id: 'passengers', label: 'Passenger Directory', icon: Users },
    { 
      id: 'complaints', 
      label: 'Complaints Triage', 
      icon: AlertTriangle, 
      badge: openComplaintCount > 0 ? openComplaintCount : undefined, 
      badgeType: 'danger' 
    },
    { id: 'bookings', label: 'Ride Monitor & Receipts', icon: History },
    { id: 'tourist-spots', label: 'Tourist Spots & Audio', icon: Compass },
    { id: 'audit-logs', label: 'Audit Trail & Compliance', icon: ShieldCheck },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '22px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--accent-glow)'
        }}>
          <ShieldCheck size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-pasada-navy)', letterSpacing: '-0.02em', margin: 0 }}>
            PasadaGuide
          </h1>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            LGU Transport Board
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-main)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon size={18} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`badge ${item.badgeType === 'danger' ? 'badge-danger' : 'badge-warning'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div style={{
        padding: '16px 18px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--color-pasada-navy)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {user?.full_name ? user.full_name.charAt(0) : 'A'}
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'LGU Official'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Bauang Administrator
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ padding: 6, color: 'var(--danger)' }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
