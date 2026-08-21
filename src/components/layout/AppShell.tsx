import React from 'react';
import { MobileNavbar } from './MobileNavbar';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuthModal: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
}) => {
  const isMapCentric = activeTab === 'home';
  const isAdminView = activeTab === 'admin';

  if (isAdminView) {
    return (
      <div className="min-h-screen w-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased relative">
        {/* Full-width admin portal */}
        <div className="w-full flex-1">
          {children}
        </div>

        {/* Floating button to quickly return to Passenger / Driver App */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#00346F] text-white font-bold text-xs shadow-xl hover:bg-[#00234d] border border-sky-400/40 transition-all active:scale-95"
            title="Switch to Passenger View"
          >
            <span>🚶 Switch to Passenger App</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen-dvh w-screen overflow-hidden bg-surface text-on-background flex flex-col antialiased relative">
      {/* Main Viewport */}
      <main className={`flex-1 w-full relative ${
        isMapCentric 
          ? 'overflow-hidden' 
          : 'overflow-y-auto pb-[90px] px-4 md:px-8 pt-4 max-w-4xl mx-auto'
      }`}>
        {children}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <MobileNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

