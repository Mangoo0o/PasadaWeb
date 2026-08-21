import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Globe, 
  User, 
  LogOut, 
  LogIn
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { setAppLanguage } from '../../i18n/config';

interface HeaderProps {
  onOpenAuthModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuthModal, activeTab, setActiveTab }) => {
  const { t, i18n } = useTranslation();
  const { user, driverProfile, signOut } = useAuth();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setAppLanguage(nextLang);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-surface/85 backdrop-blur-md px-4 py-2.5 border-b border-surface-container-highest/60 shadow-sm">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <Bike className="w-5 h-5 text-secondary-container" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg text-on-background tracking-tight">
                Pasada<span className="text-primary font-black">Guide</span>
              </span>
              <span className="bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded text-[10px] font-extrabold shadow-inner border border-secondary/20">
                BAUANG
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium">
              Bauang Civic Smart Transit
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-primary border border-outline-variant/40 hover:bg-surface-container transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
          </button>

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-on-background line-clamp-1 max-w-[120px]">
                  {user.full_name}
                </span>
                <span className="text-[9px] uppercase font-extrabold text-primary">
                  {user.role}
                </span>
              </div>

              <button
                onClick={signOut}
                className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary shadow-md hover:bg-primary-container transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
