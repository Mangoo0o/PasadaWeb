import React from 'react';
import { Smartphone } from 'lucide-react';
import { MobileNavbar } from './MobileNavbar';
import { cn } from '../../lib/utils';

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
  const isMapCentric = activeTab === 'pasada';
  const isAdminView = activeTab === 'admin';
  const isDiscoveryHome = activeTab === 'home';

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
            className={cn(
              'flex items-center gap-2 h-9 px-4 rounded-md font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer',
              'bg-[#0052d1] hover:bg-[#206afa] text-white border border-sky-400/40 shadow-[#0052d1]/30 backdrop-blur-md'
            )}
            title="Switch to Passenger View"
          >
            <Smartphone size={15} />
            <span>Switch to Passenger App</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        margin: 0,
        padding: 0,
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
          background: 'transparent'
        } : {
          paddingTop: 'max(10px, calc(env(safe-area-inset-top, 0px) + 6px))'
        }}
        className={
          isMapCentric 
            ? '' 
            : isDiscoveryHome 
              ? 'flex-1 min-h-0 overflow-y-auto w-full bg-[#dbe9f4] min-h-full pb-36 sm:pb-40' 
              : 'flex-1 min-h-0 overflow-y-auto pb-36 sm:pb-40 px-3 sm:px-5 md:px-8 w-full max-w-4xl mx-auto bg-slate-50 dark:bg-slate-950 min-h-full'
        }
      >
        {children}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <MobileNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

