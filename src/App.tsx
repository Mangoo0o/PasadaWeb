import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { AuthModal } from './components/auth/AuthModal';
import { PassengerHome } from './pages/PassengerHome';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminPortal } from './pages/AdminPortal';
import { TouristGuide } from './pages/TouristGuide';
import { HistoryAndReceipts } from './pages/HistoryAndReceipts';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync default tab if role changes
  useEffect(() => {
    if (user?.role === 'driver') {
      setActiveTab('driver');
    } else if (user?.role === 'admin') {
      setActiveTab('admin');
    }
  }, [user?.role]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <PassengerHome onOpenAuthModal={() => setIsAuthModalOpen(true)} />;
      case 'driver':
        return <DriverDashboard onOpenAuthModal={() => setIsAuthModalOpen(true)} />;
      case 'admin':
        return <AdminPortal />;
      case 'tourist':
        return <TouristGuide />;
      case 'history':
        return <HistoryAndReceipts onOpenAuthModal={() => setIsAuthModalOpen(true)} />;
      default:
        return <PassengerHome onOpenAuthModal={() => setIsAuthModalOpen(true)} />;
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenAuthModal={() => setIsAuthModalOpen(true)}
    >
      {renderActiveView()}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialRole={user?.role || 'passenger'}
      />
    </AppShell>
  );
};

export default App;
