import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DiscoveryHome } from './pages/DiscoveryHome';
import { PassengerHome } from './pages/PassengerHome';
import { PassengerProfile } from './pages/PassengerProfile';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverDispatch } from './pages/DriverDispatch';
import { DriverProfile } from './pages/DriverProfile';
import { AdminPortal } from './pages/AdminPortal';
import { HistoryAndReceipts } from './pages/HistoryAndReceipts';
import { TouristSpot } from './types/database.types';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [selectedSpotForRide, setSelectedSpotForRide] = useState<TouristSpot | null>(null);

  const getRoleDefaultTab = (role?: string) => {
    if (role === 'driver') return 'driver';
    if (role === 'admin') return 'admin';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('pasada_active_tab');
    if (user?.role === 'driver' && ['driver', 'dispatch', 'profile', 'history'].includes(saved || '')) {
      return saved || 'driver';
    }
    if (user?.role === 'passenger' && ['home', 'pasada', 'history', 'profile'].includes(saved || '')) {
      return saved || 'home';
    }
    if (user?.role === 'admin') {
      return saved || 'admin';
    }
    return getRoleDefaultTab(user?.role);
  });

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('pasada_active_tab', tab);
  };

  const handleSelectSpotForRide = (spot: TouristSpot) => {
    setSelectedSpotForRide(spot);
    handleSetActiveTab('pasada');
  };

  // Sync role-based tab whenever user logs in or switches account
  useEffect(() => {
    if (user?.role === 'driver') {
      const savedTab = localStorage.getItem('pasada_active_tab');
      if (!savedTab || !['driver', 'dispatch', 'profile', 'history'].includes(savedTab) || savedTab === 'home' || savedTab === 'pasada') {
        handleSetActiveTab('driver');
      }
    } else if (user?.role === 'admin') {
      const savedTab = localStorage.getItem('pasada_active_tab');
      if (!savedTab || !['admin', 'home', 'pasada', 'history', 'profile'].includes(savedTab)) {
        handleSetActiveTab('admin');
      }
    } else if (user?.role === 'passenger') {
      const savedTab = localStorage.getItem('pasada_active_tab');
      if (!savedTab || !['home', 'pasada', 'history', 'profile'].includes(savedTab) || ['driver', 'dispatch'].includes(savedTab)) {
        handleSetActiveTab('home');
      }
    }
  }, [user?.id, user?.role]);

  // Loading state while verifying Supabase session on startup
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0052d1] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-10 h-10 border-3 border-[#fcd400] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-sky-100 tracking-wider">
            Kinakarga ang PasadaGuide...
          </span>
        </div>
      </div>
    );
  }

  // 1. Root Gateway: If not logged in, render the Login & Signup Page directly connected to Supabase
  if (!user) {
    return <AuthPage />;
  }

  // 2. Authenticated App Experience
  const renderActiveView = () => {
    // Role guard: if user is driver and on passenger-only tabs, render DriverDashboard
    if (user?.role === 'driver' && (activeTab === 'home' || activeTab === 'pasada')) {
      return <DriverDashboard setActiveTab={handleSetActiveTab} />;
    }
    // Role guard: if user is passenger and on driver-only tabs, render DiscoveryHome
    if (user?.role === 'passenger' && (activeTab === 'driver' || activeTab === 'dispatch')) {
      return <DiscoveryHome setActiveTab={handleSetActiveTab} onSelectDestination={handleSelectSpotForRide} />;
    }

    switch (activeTab) {
      case 'home':
        return <DiscoveryHome setActiveTab={handleSetActiveTab} onSelectDestination={handleSelectSpotForRide} />;
      case 'pasada':
        return <PassengerHome preselectedSpot={selectedSpotForRide} />;
      case 'driver':
        return <DriverDashboard setActiveTab={handleSetActiveTab} />;
      case 'dispatch':
        return <DriverDispatch />;
      case 'profile':
        return user?.role === 'driver' ? <DriverProfile /> : <PassengerProfile setActiveTab={handleSetActiveTab} />;
      case 'admin':
        return <AdminPortal />;
      case 'history':
        return <HistoryAndReceipts setActiveTab={handleSetActiveTab} />;
      default:
        return user?.role === 'driver' 
          ? <DriverDashboard setActiveTab={handleSetActiveTab} /> 
          : <DiscoveryHome setActiveTab={handleSetActiveTab} onSelectDestination={handleSelectSpotForRide} />;
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={handleSetActiveTab}
    >
      {renderActiveView()}
    </AppShell>
  );
};

export default App;
