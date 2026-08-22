import React from 'react';
import { MobileNavbar } from './MobileNavbar';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuthModal?: () => void;
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
    <div 
      style={{
        position: 'fixed',
        top: '-100px',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100% + 100px)',
        maxWidth: '100%',
        margin: 0,
        padding: 0,
        paddingTop: '100px',
        overflow: 'hidden',
        background: 'transparent'
      }}
      className="text-on-background flex flex-col antialiased"
    >
      {/* Main Viewport */}
      <main 
        style={isMapCentric ? {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          background: 'transparent',
          zIndex: 0
        } : {
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)'
        }}
        className={isMapCentric ? '' : 'flex-1 overflow-y-auto pb-24 px-3 sm:px-5 md:px-8 pt-4 w-full max-w-4xl mx-auto z-0 bg-slate-50 dark:bg-slate-950 min-h-full'}
      >
        {children}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <MobileNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

