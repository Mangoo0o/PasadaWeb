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

import { supabase } from '../api/supabaseClient';
import { fetchLocationFares, saveLocationFare, deleteLocationFare } from '../services/fareService';
import type { 
  Terminal, Driver, FareMatrix, LocationFare, Booking, Complaint, TouristSpot, AdminAction, 
  VerificationStatus, ComplaintStatus, Profile, NotificationItem 
} from './types';

const AdminContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

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

  // Fetch Live Data from Supabase Database
  const fetchLiveData = useCallback(async () => {
    try {
      const [
        resTerminals,
        resDrivers,
        resDriverProfiles,
        resFareMatrix,
        resBookings,
        resComplaints,
        resTouristSpots,
        resPassengerProfiles,
        resLocationFares
      ] = await Promise.all([
        supabase.from('terminals').select('*'),
        supabase.from('drivers').select('*, profile:profiles(*), terminals(*)'),
        supabase.from('profiles').select('*').eq('role', 'driver'),
        supabase.from('fare_matrix').select('*, terminals(*)'),
        supabase.from('bookings').select('*, passenger:profiles(*), driver:drivers(*, profile:profiles(*))'),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
        supabase.from('tourist_spots').select('*'),
        supabase.from('profiles').select('*').eq('role', 'passenger'),
        fetchLocationFares()
      ]);

      // Safely query admin_actions if table exists in DB
      try {
        const { data: auditData, error: auditError } = await supabase
          .from('admin_actions')
          .select('*, admin:profiles(*)')
          .order('created_at', { ascending: false });
        
        if (!auditError && auditData) {
          setAuditLogs(auditData as AdminAction[]);
        }
      } catch (err) {
        // Silently skip if table is not created yet
      }

      if (resTerminals.data) {
        setTerminals(resTerminals.data as Terminal[]);
      }
      
      const rawDrivers = (resDrivers.data as any[]) || [];
      const driverProfiles = (resDriverProfiles.data as Profile[]) || [];
      const passengerProfiles = (resPassengerProfiles.data as Profile[]) || [];

      // Create map of drivers
      const driverMap = new Map<string, Driver>();

      rawDrivers.forEach(d => {
        const pId = d.profile_id || d.id;
        driverMap.set(pId, {
          profile_id: pId,
          id: d.id,
          terminal_id: d.terminal_id,
          plate_number: d.plate_number || 'ABC 1234',
          body_number: d.body_number,
          tricycle_model: d.tricycle_model || 'Standard Tricycle',
          verification_status: (d.verification_status as VerificationStatus) || 'pending',
          rating: d.rating_avg || d.rating || 5.0,
          total_trips: d.total_trips || 0,
          current_lat: d.current_lat,
          current_lng: d.current_lng,
          is_available: d.is_available,
          profile: d.profile || d.profiles || undefined,
          terminal: d.terminals || undefined
        });
      });

      // Merge any driver who registered in profiles
      driverProfiles.forEach(p => {
        if (!driverMap.has(p.id)) {
          const generatedPlate = `BG-${Math.abs(p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 37 % 90000 + 10000)}`;
          driverMap.set(p.id, {
            profile_id: p.id,
            id: p.id,
            terminal_id: null,
            plate_number: generatedPlate,
            tricycle_model: 'Standard Tricycle',
            verification_status: 'pending',
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

      // Map complaints cleanly
      const rawComplaints = (resComplaints.data as any[]) || [];
      const mappedComplaints: Complaint[] = rawComplaints.map(c => {
        const pass = passengerProfiles.find(p => p.id === c.passenger_id);
        const drv = c.driver_id ? driverMap.get(c.driver_id) : undefined;
        return {
          ...c,
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

    return () => {
      supabase.removeChannel(channel);
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
    const log: AdminAction = {
      id: `a-${Date.now()}`,
      admin_id: user.id,
      action_type: 'SAVE_LOCATION_FARE',
      target_table: 'location_fares',
      target_id: res.data?.id,
      details_json: { 
        location: fareData.location_name, 
        standard_fare: fareData.standard_fare, 
        proximity_radius_meters: fareData.proximity_radius_meters,
        icon: fareData.icon || 'pin'
      },
      created_at: new Date().toISOString(),
      admin: user
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleDeleteLocationFare = async (id: string) => {
    await deleteLocationFare(id);
    setLocationFares(prev => prev.filter(f => f.id !== id));

    const log: AdminAction = {
      id: `a-${Date.now()}`,
      admin_id: user.id,
      action_type: 'DELETE_LOCATION_FARE',
      target_table: 'location_fares',
      target_id: id,
      details_json: { id },
      created_at: new Date().toISOString(),
      admin: user
    };
    setAuditLogs(prev => [log, ...prev]);
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
    const log: AdminAction = {
      id: `a-${Date.now()}`,
      admin_id: user.id,
      action_type: 'UPDATE_FARE_MATRIX',
      target_table: 'fare_matrix',
      target_id: updated.id,
      details_json: { terminal: updated.origin_terminal?.name, base_fare: updated.base_fare, per_km_rate: updated.per_km_rate },
      created_at: new Date().toISOString(),
      admin: user
    };
    setAuditLogs(prev => [log, ...prev]);
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
        alert(`Failed to save terminal to database: ${error.message}`);
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
      }
    } catch (e: any) {
      console.error('Error adding terminal in DB:', e);
      alert(`Failed to save terminal: ${e.message || e}`);
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
        alert(`Failed to update terminal: ${error.message}`);
      }
    } catch (e: any) {
      console.error('Error updating terminal in DB:', e);
    }
  };

  const handleUpdateDriverStatus = async (profileId: string, status: VerificationStatus) => {
    setDrivers(prev => prev.map(d => (d.profile_id === profileId || d.id === profileId) ? { ...d, verification_status: status } : d));
    
    try {
      await supabase.from('drivers').update({ verification_status: status }).eq('id', profileId);
    } catch (e) {
      console.error('Error updating driver status in DB:', e);
    }

    const driver = drivers.find(d => d.profile_id === profileId || d.id === profileId);
    const log: AdminAction = {
      id: `a-${Date.now()}`,
      admin_id: user.id,
      action_type: status === 'approved' ? 'APPROVE_DRIVER' : status === 'suspended' ? 'SUSPEND_DRIVER' : 'REJECT_DRIVER',
      target_table: 'drivers',
      target_id: profileId,
      details_json: { driver_name: driver?.profile?.full_name, plate_number: driver?.plate_number, new_status: status },
      created_at: new Date().toISOString(),
      admin: user
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleUpdateComplaint = async (id: string, status: ComplaintStatus, notes?: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, resolution_notes: notes } : c));
    
    try {
      await supabase.from('complaints').update({ status, resolution_notes: notes, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id);
    } catch (e) {
      console.error('Error updating complaint in DB:', e);
    }

    const log: AdminAction = {
      id: `a-${Date.now()}`,
      admin_id: user.id,
      action_type: 'RESOLVE_COMPLAINT',
      target_table: 'complaints',
      target_id: id,
      details_json: { complaint_id: id, status, resolution_notes: notes },
      created_at: new Date().toISOString(),
      admin: user
    };
    setAuditLogs(prev => [log, ...prev]);
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
        alert(`Failed to save tourist spot: ${error.message}`);
        return;
      }
      if (data) {
        setTouristSpots(prev => [...prev, data as TouristSpot]);
      }
    } catch (e: any) {
      console.error('Error adding tourist spot in DB:', e);
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
        alert(`Failed to update spot: ${error.message}`);
      }
    } catch (e: any) {
      console.error('Error updating tourist spot in DB:', e);
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
        />

        <div className="main-content">
          <Header
            notifications={notifications}
            markAsRead={handleMarkNotificationRead}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onRefreshData={fetchLiveData}
          />

          {activeTab === 'dashboard' && (
            <DashboardPage
              terminals={terminals}
              drivers={drivers}
              bookings={bookings}
              complaints={complaints}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'fare-matrix' && (
            <FareMatrixPage
              locationFares={locationFares}
              terminals={terminals}
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

          {activeTab === 'audit-logs' && (
            <AuditLogsPage auditLogs={auditLogs} />
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
