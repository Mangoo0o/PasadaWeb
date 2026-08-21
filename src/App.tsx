import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { PassengerHome } from './pages/PassengerHome';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverDispatch } from './pages/DriverDispatch';
import { DriverProfile } from './pages/DriverProfile';
import { AdminPortal } from './pages/AdminPortal';
import { TouristGuide } from './pages/TouristGuide';
import { HistoryAndReceipts } from './pages/HistoryAndReceipts';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const getRoleDefaultTab = (role?: string) => {
    if (role === 'driver') return 'driver';
    if (role === 'admin') return 'admin';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<string>(() => getRoleDefaultTab(user?.role));

  // Sync active tab whenever user or role changes upon login
  useEffect(() => {
    if (user?.role) {
      setActiveTab(getRoleDefaultTab(user.role));
    }
  }, [user?.role, user?.id]);

  // Loading state while verifying Supabase session on startup
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#001D40] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-10 h-10 border-3 border-[#00C1FD] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-sky-200 tracking-wider">
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
    switch (activeTab) {
      case 'home':
        return <PassengerHome />;
      case 'driver':
        return <DriverDashboard setActiveTab={setActiveTab} />;
      case 'dispatch':
        return <DriverDispatch />;
      case 'profile':
        return <DriverProfile />;
      case 'admin':
        return <AdminPortal />;
      case 'tourist':
        return <TouristGuide />;
      case 'history':
        return <HistoryAndReceipts />;
      default:
        return user?.role === 'driver' ? <DriverDashboard setActiveTab={setActiveTab} /> : <PassengerHome />;
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {renderActiveView()}
    </AppShell>
  );
};

export default App;
