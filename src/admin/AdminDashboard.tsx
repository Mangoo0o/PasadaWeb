import React, { useState, useCallback, useEffect } from 'react';
import './admin.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AdminAuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { FareMatrixPage } from './pages/FareMatrixPage';
import { DriversPage } from './pages/DriversPage';
import { PassengersPage } from './pages/PassengersPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { BookingsPage } from './pages/BookingsPage';
import { TouristSpotsPage } from './pages/TouristSpotsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';

import { supabase, isConfigured } from '../api/supabaseClient';
import { fetchLocationFares, saveLocationFare, deleteLocationFare } from '../services/fareService';
import { updateDriverVerificationStatus } from '../services/driverDocumentService';
import { logAdminMovement, fetchAuditLogs } from '../services/auditService';
import type { 
  Terminal, Driver, FareMatrix, LocationFare, Booking, Complaint, TouristSpot, AdminAction, 
  VerificationStatus, ComplaintStatus, Profile, NotificationItem 
} from './types';

const AdminContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [auditFilterQuery, setAuditFilterQuery] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pasada_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pasada_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Application Data State
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fareMatrix, setFareMatrix] = useState<FareMatrix[]>([]);
  const [locationFares, setLocationFares] = useState<LocationFare[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [touristSpots, setTouristSpots] = useState<TouristSpot[]>([]);
  const [passengers, setPassengers] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const notifyError = useCallback((title: string, msg: string) => {
    setNotifications(prev => [
      {
        id: `err-${Date.now()}`,
        recipient_role: 'admin',
        type: 'system',
        title,
        message: msg,
        read: false,
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
  }, []);

  // Fetch Live Data from Supabase Database
  const fetchLiveData = useCallback(async () => {
    if (!isConfigured) {
      return;
    }

    try {
      const [
        resTerminals,
        resDrivers,
        resAllProfiles,
        resFareMatrix,
        resBookings,
        resComplaints,
        resTouristSpots,
        resLocationFares
      ] = await Promise.all([
        supabase.from('terminals').select('*'),
        supabase.from('drivers').select('*, profile:profiles(*), terminals(*)'),
        supabase.from('profiles').select('*'),
        supabase.from('fare_matrix').select('*, terminals(*)'),
        supabase.from('bookings').select('*, passenger:profiles!bookings_passenger_id_fkey(*), driver:drivers(*, profile:profiles(*))'),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
        supabase.from('tourist_spots').select('*'),
        fetchLocationFares()
      ]);

      // Fetch live & resilient cached audit actions
      try {
        const auditData = await fetchAuditLogs();
        setAuditLogs(auditData);
      } catch (err) {
        console.warn('Audit fetch note:', err);
      }

      if (resTerminals.data) {
        setTerminals(resTerminals.data as Terminal[]);
      }
      
      const rawDrivers = (resDrivers.data as any[]) || [];
      const allProfiles = (resAllProfiles.data as Profile[]) || [];
      const driverProfiles = allProfiles.filter(p => p.role === 'driver');
      const passengerProfiles = allProfiles.filter(p => p.role === 'passenger');

      const profileMap = new Map<string, Profile>();
      allProfiles.forEach(p => profileMap.set(p.id, p));

      // Create map of drivers from real database records
      const driverMap = new Map<string, Driver>();

      rawDrivers.forEach(d => {
        const pId = d.profile_id || d.id;
        const localStatus = (localStorage.getItem(`pasada_driver_status_${pId}`) || localStorage.getItem(`pasada_driver_status_${d.id}`)) as VerificationStatus | null;
        const localRejection = localStorage.getItem(`pasada_driver_rejection_${pId}`) || localStorage.getItem(`pasada_driver_rejection_${d.id}`) || d.rejection_reason;

        driverMap.set(pId, {
          profile_id: pId,
          id: d.id,
          terminal_id: d.terminal_id,
          plate_number: d.plate_number || 'N/A',
          body_number: d.body_number,
          tricycle_model: d.tricycle_model || 'Tricycle',
          verification_status: localStatus || (d.verification_status as VerificationStatus) || 'pending',
          rejection_reason: localRejection || undefined,
          rating: d.rating_avg || d.rating || 5.0,
          total_trips: d.total_trips || 0,
          current_lat: d.current_lat,
          current_lng: d.current_lng,
          is_available: d.is_available,
          profile: d.profile || d.profiles || undefined,
          terminal: d.terminals || undefined
        });
      });

      // Merge drivers who registered in profiles
      driverProfiles.forEach(p => {
        const localStatus = localStorage.getItem(`pasada_driver_status_${p.id}`) as VerificationStatus | null;
        const localRejection = localStorage.getItem(`pasada_driver_rejection_${p.id}`);

        if (!driverMap.has(p.id)) {
          driverMap.set(p.id, {
            profile_id: p.id,
            id: p.id,
            terminal_id: null,
            plate_number: p.phone_number || 'Pending Assignment',
            tricycle_model: 'Tricycle',
            verification_status: localStatus || 'pending',
            rejection_reason: localRejection || undefined,
            rating: 5.0,
            total_trips: 0,
            profile: p,
            terminal: undefined
          });
        } else {
          const existing = driverMap.get(p.id)!;
          if (!existing.profile) {
            existing.profile = p;
          }
          if (localStatus && existing.verification_status !== localStatus) {
            existing.verification_status = localStatus;
          }
        }
      });

      setDrivers(Array.from(driverMap.values()));

      if (resLocationFares) {
        setLocationFares(resLocationFares);
      }

      if (resFareMatrix.data) {
        setFareMatrix(resFareMatrix.data.map((fm: any) => ({
          ...fm,
          origin_terminal: fm.terminals || undefined
        })) as FareMatrix[]);
      }

      if (resBookings.data) {
        setBookings(resBookings.data as Booking[]);
      }

      // Map complaints cleanly with real names & body numbers
      const rawComplaints = (resComplaints.data as any[]) || [];
      const mappedComplaints: Complaint[] = rawComplaints.map(c => {
        const pass = profileMap.get(c.passenger_id);
        const drv = c.driver_id ? (driverMap.get(c.driver_id) || Array.from(driverMap.values()).find(d => d.id === c.driver_id)) : undefined;
        return {
          ...c,
          passenger_name: pass?.full_name || c.passenger_name || 'Passenger',
          driver_name: drv?.profile?.full_name || c.driver_name || 'Driver',
          driver_body_number: drv?.body_number || drv?.plate_number || c.driver_body_number || 'N/A',
          passenger: c.passenger || pass || undefined,
          driver: c.driver || drv || undefined
        };
      });
      setComplaints(mappedComplaints);

      if (resTouristSpots.data) {
        setTouristSpots(resTouristSpots.data as TouristSpot[]);
      }

      setPassengers(passengerProfiles);
    } catch (err) {
      console.error('Error fetching live Supabase data:', err);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    fetchLiveData();

    // Realtime postgres changes
    const channel = supabase
      .channel('pasada-admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        fetchLiveData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchLiveData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchLiveData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchLiveData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'location_fares' }, () => {
        fetchLiveData();
      })
      .subscribe();

    const handleAuditLogAdded = (e: any) => {
      if (e.detail) {
        setAuditLogs(prev => [e.detail, ...prev.filter(l => l.id !== e.detail.id)]);
      }
    };
    window.addEventListener('pasada_audit_log_added', handleAuditLogAdded);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('pasada_audit_log_added', handleAuditLogAdded);
    };
  }, [fetchLiveData]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
          Loading PasadaGuide Admin Suite...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // --- Actions & State Updates ---

  const handleSaveLocationFare = async (fareData: Partial<LocationFare> & { location_name: string; lat: number; lng: number; standard_fare: number; icon?: string }) => {
    const res = await saveLocationFare(fareData);
    if (res.data) {
      setLocationFares(prev => {
        const exists = prev.some(f => f.id === res.data!.id);
        if (exists) {
          return prev.map(f => f.id === res.data!.id ? res.data! : f);
        }
        return [res.data!, ...prev];
      });
    }

    // Log in Audit Trail
    await logAdminMovement(user, 'SAVE_LOCATION_FARE', 'location_fares', res.data?.id, { 
      location: fareData.location_name, 
      standard_fare: fareData.standard_fare, 
      proximity_radius_meters: fareData.proximity_radius_meters,
      icon: fareData.icon || 'pin'
    });
  };

  const handleDeleteLocationFare = async (id: string) => {
    await deleteLocationFare(id);
    setLocationFares(prev => prev.filter(f => f.id !== id));

    await logAdminMovement(user, 'DELETE_LOCATION_FARE', 'location_fares', id, { id });
  };

  const handleUpdateFare = async (updated: FareMatrix) => {
    setFareMatrix(prev => prev.map(f => f.id === updated.id ? updated : f));
    try {
      await supabase.from('fare_matrix').update({
        base_fare: updated.base_fare,
        per_km_rate: updated.per_km_rate,
        per_minute_rate: updated.per_minute_rate || 1.0,
        effective_date: updated.effective_date
      }).eq('id', updated.id);
    } catch (e) {
      console.error('Error updating fare matrix in DB:', e);
    }
    
    // Log in Audit Trail
    await logAdminMovement(user, 'UPDATE_FARE_MATRIX', 'fare_matrix', updated.id, { 
      terminal: updated.origin_terminal?.name, 
      base_fare: updated.base_fare, 
      per_km_rate: updated.per_km_rate 
    });
  };

  const handleAddTerminal = async (newTerminal: Terminal) => {
    try {
      const payload = {
        name: newTerminal.name,
        code: newTerminal.code || `TRM-${Date.now()}`,
        lat: Number(newTerminal.lat),
        lng: Number(newTerminal.lng),
        base_fare: newTerminal.base_fare || 15.00,
        per_km_rate: newTerminal.per_km_rate || 5.00,
        description: `Coverage: ${newTerminal.coverage_radius_km || 3.5} km`
      };

      const { data, error } = await supabase.from('terminals').insert(payload).select().single();
      if (error) {
        console.error('Error adding terminal in DB:', error);
        notifyError('Terminal Registration Note', error.message);
        return;
      }
      
      if (data) {
        setTerminals(prev => [...prev, {
          ...newTerminal,
          id: data.id,
          lat: Number(data.lat),
          lng: Number(data.lng),
          coverage_radius_km: newTerminal.coverage_radius_km || 3.5
        }]);

        await logAdminMovement(user, 'ADD_TERMINAL', 'terminals', data.id, {
          name: newTerminal.name,
          code: newTerminal.code,
          base_fare: newTerminal.base_fare
        });
      }
    } catch (e: any) {
      console.error('Error adding terminal in DB:', e);
      notifyError('Terminal Registration Note', e.message || String(e));
    }
  };

  const handleUpdateTerminal = async (updated: Terminal) => {
    setTerminals(prev => prev.map(t => t.id === updated.id ? updated : t));
    try {
      const { error } = await supabase.from('terminals').update({
        name: updated.name,
        lat: Number(updated.lat),
        lng: Number(updated.lng)
      }).eq('id', updated.id);

      if (error) {
        console.error('Error updating terminal in DB:', error);
        notifyError('Terminal Update Note', error.message);
      } else {
        await logAdminMovement(user, 'UPDATE_TERMINAL', 'terminals', updated.id, {
          name: updated.name,
          lat: updated.lat,
          lng: updated.lng
        });
      }
    } catch (e: any) {
      console.error('Error updating terminal in DB:', e);
      notifyError('Terminal Update Note', e.message || String(e));
    }
  };

  const handleUpdateDriverStatus = async (profileId: string, status: VerificationStatus, reason?: string) => {
    setDrivers(prev => prev.map(d => (d.profile_id === profileId || d.id === profileId) ? { ...d, verification_status: status, rejection_reason: reason } : d));
    
    const res = await updateDriverVerificationStatus(profileId, status, reason, user.id);
    if (!res.success) {
      console.warn('Update driver verification status warning:', res.error);
      throw new Error(res.error || 'Failed to update verification status');
    }

    const driver = drivers.find(d => d.profile_id === profileId || d.id === profileId);
    await logAdminMovement(
      user,
      status === 'approved' ? 'APPROVE_DRIVER' : status === 'suspended' ? 'SUSPEND_DRIVER' : 'REJECT_DRIVER',
      'drivers',
      profileId,
      { 
        driver_name: driver?.profile?.full_name, 
        plate_number: driver?.plate_number, 
        new_status: status,
        rejection_reason: reason 
      }
    );
  };

  const handleUpdateComplaint = async (id: string, status: ComplaintStatus, notes?: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, resolution_notes: notes } : c));
    
    try {
      await supabase.from('complaints').update({ status, resolution_notes: notes, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id);
    } catch (e) {
      console.error('Error updating complaint in DB:', e);
    }

    await logAdminMovement(user, 'RESOLVE_COMPLAINT', 'complaints', id, { 
      complaint_id: id, 
      status, 
      resolution_notes: notes 
    });
  };

  const handleAddTouristSpot = async (newSpot: TouristSpot) => {
    try {
      const payload = {
        name: newSpot.name,
        description: newSpot.description,
        opening_hours: newSpot.opening_hours,
        lat: Number(newSpot.lat),
        lng: Number(newSpot.lng),
        qr_code_ref: newSpot.qr_code_ref,
        audio_url: newSpot.audio_url,
      };

      const { data, error } = await supabase.from('tourist_spots').insert(payload).select().single();
      if (error) {
        console.error('Error adding tourist spot in DB:', error);
        notifyError('Destination Note', error.message);
        return;
      }
      if (data) {
        setTouristSpots(prev => [...prev, data as TouristSpot]);
        await logAdminMovement(user, 'ADD_TOURIST_SPOT', 'tourist_spots', data.id, {
          name: newSpot.name,
          category: newSpot.category
        });
      }
    } catch (e: any) {
      console.error('Error adding tourist spot in DB:', e);
      notifyError('Destination Note', e.message || String(e));
    }
  };

  const handleUpdateTouristSpot = async (updated: TouristSpot) => {
    setTouristSpots(prev => prev.map(s => s.id === updated.id ? updated : s));
    try {
      const { error } = await supabase.from('tourist_spots').update({
        name: updated.name,
        description: updated.description,
        opening_hours: updated.opening_hours,
        lat: Number(updated.lat),
        lng: Number(updated.lng),
        audio_url: updated.audio_url
      }).eq('id', updated.id);

      if (error) {
        console.error('Error updating tourist spot in DB:', error);
        notifyError('Destination Note', error.message);
      } else {
        await logAdminMovement(user, 'UPDATE_TOURIST_SPOT', 'tourist_spots', updated.id, {
          name: updated.name
        });
      }
    } catch (e: any) {
      console.error('Error updating tourist spot in DB:', e);
      notifyError('Destination Note', e.message || String(e));
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const pendingDriversCount = drivers.filter(d => d.verification_status === 'pending').length;
  const openComplaintsCount = complaints.filter(c => c.status !== 'resolved').length;

  return (
    <div className="admin-app-root">
      <div className="app-container">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingDriverCount={pendingDriversCount}
          openComplaintCount={openComplaintsCount}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        <div className="main-content">
          <Header
            notifications={notifications}
            markAsRead={handleMarkNotificationRead}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onRefreshData={fetchLiveData}
            onToggleSidebar={toggleSidebar}
          />

          {!isConfigured && (
            <div className="mx-6 mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">Supabase Database Connection Required</p>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Your <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">.env</code> file currently contains placeholder credentials (<code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">https://your-project-id.supabase.co</code>). 
                  To load live transit data from your database, update <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">VITE_SUPABASE_URL</code> and <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> with your project API settings.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              terminals={terminals}
              drivers={drivers}
              bookings={bookings}
              complaints={complaints}
              locationFares={locationFares}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'fare-matrix' && (
            <FareMatrixPage
              locationFares={locationFares}
              terminals={terminals}
              drivers={drivers}
              onSaveLocationFare={handleSaveLocationFare}
              onDeleteLocationFare={handleDeleteLocationFare}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversPage
              drivers={drivers}
              terminals={terminals}
              onUpdateStatus={handleUpdateDriverStatus}
            />
          )}

          {activeTab === 'passengers' && (
            <PassengersPage passengers={passengers} />
          )}

          {activeTab === 'complaints' && (
            <ComplaintsPage
              complaints={complaints}
              onUpdateComplaint={handleUpdateComplaint}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsPage bookings={bookings} />
          )}

          {activeTab === 'tourist-spots' && (
            <TouristSpotsPage
              spots={touristSpots}
              onAddSpot={handleAddTouristSpot}
              onUpdateSpot={handleUpdateTouristSpot}
            />
          )}

          {activeTab === 'admin-users' && (
            <AdminUsersPage
              currentUser={user}
              onNavigateToAuditTrail={(filterQuery) => {
                const targetQuery = (filterQuery || '').trim();
                setAuditFilterQuery(targetQuery);
                fetchAuditLogs().then(logs => setAuditLogs(logs)).catch(() => {});
                setActiveTab('audit-logs');
              }}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsPage 
              auditLogs={auditLogs} 
              initialSearchQuery={auditFilterQuery} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AdminDashboard;
