import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Car,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/database.types';

export const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  
  const [view, setView] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [regBodyNumber, setRegBodyNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await signIn(loginEmail.trim(), loginPassword);
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Hindi makapag-login. Pakisubukang muli.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (!regName.trim()) {
        setErrorMsg('Paki-lagay ang iyong buong pangalan.');
        setIsLoading(false);
        return;
      }

      const res = await signUp({
        role: role as UserRole,
        email: regEmail.trim(),
        password: regPassword,
        fullName: regName.trim(),
        phoneNumber: regPhone.trim(),
        plateNumber: role === 'driver' ? regPlate.trim() : undefined,
        bodyNumber: role === 'driver' ? (regBodyNumber.trim() || regPlate.trim()) : undefined,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Matagumpay ang pagpaparehistro! Maaari ka nang mag-login.');
        setTimeout(() => {
          setView('login');
          setLoginEmail(regEmail);
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'May naganap na error sa pagpaparehistro.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for testing / demonstration
  const handleQuickFill = (targetRole: 'passenger' | 'driver' | 'admin') => {
    setErrorMsg(null);
    setView('login');
    if (targetRole === 'admin') {
      setRole('passenger');
      setLoginEmail('admin@gmail.com');
      setLoginPassword('admin123');
    } else if (targetRole === 'driver') {
      setRole('driver');
      setLoginEmail('driver.juan@gmail.com');
      setLoginPassword('driver123');
    } else {
      setRole('passenger');
      setLoginEmail('passenger.maria@gmail.com');
      setLoginPassword('pass12345');
    }
  };

  return (
    <div className="bg-[#f4faff] min-h-screen text-[#071e27] antialiased relative overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-[#0056b3] selection:text-white font-sans">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#0056b3]/15 to-transparent pointer-events-none -z-10"></div>
      <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[#0056b3]/10 blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute -bottom-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[#fcd400]/10 blur-3xl pointer-events-none -z-10"></div>

      <main className="w-full max-w-md px-3 py-6 relative z-10">
        
        {/* Branding Header */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#003f87] text-white shadow-lg shadow-[#003f87]/25 mb-3">
            <Car className="w-8 h-8 text-[#00C1FD]" />
          </div>
          <h1 className="text-3xl font-black text-[#003f87] tracking-tight">
            PasadaGuide
          </h1>
          <p className="text-sm font-medium text-[#424752] mt-0.5">
            Your ride, your rules.
          </p>
        </header>

        {/* Main Glass Panel */}
        <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 p-6 border border-white/60 dark:border-slate-800 relative overflow-hidden">
          
          {/* Mode Toggle (Passenger / Driver) */}
          <div className="bg-[#d5ecf8] dark:bg-slate-800 rounded-full p-1 flex mb-5 relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#003f87] rounded-full shadow-md transition-all duration-300 ease-out z-0 ${
                role === 'driver' ? 'left-[calc(50%+2px)]' : 'left-1'
              }`}
            />
            <button 
              type="button"
              onClick={() => setRole('passenger')}
              className={`flex-1 py-2 text-xs font-bold text-center relative z-10 transition-colors duration-300 cursor-pointer ${
                role === 'passenger' ? 'text-white' : 'text-[#424752] dark:text-slate-300'
              }`}
            >
              Passenger
            </button>
            <button 
              type="button"
              onClick={() => setRole('driver')}
              className={`flex-1 py-2 text-xs font-bold text-center relative z-10 transition-colors duration-300 cursor-pointer ${
                role === 'driver' ? 'text-white' : 'text-[#424752] dark:text-slate-300'
              }`}
            >
              Driver
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN VIEW */}
          {view === 'login' && (
            <div className="transition-all duration-300 animate-in fade-in">
              <h2 className="text-lg font-bold text-[#071e27] dark:text-slate-100 mb-4">
                Welcome Back
              </h2>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="sr-only" htmlFor="login-email">Email or Phone</label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003f87] transition-colors" />
                    <input 
                      id="login-email"
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email or Phone Number"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="sr-only" htmlFor="login-password">Password</label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003f87] transition-colors" />
                    <input 
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-11 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003f87] transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Paki-ugnayan ang LGU TODA Office upang i-reset ang password.'); }} className="text-xs font-semibold text-[#003f87] dark:text-[#00C1FD] hover:underline">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm rounded-full shadow-md shadow-[#003f87]/25 active:scale-[0.98] transition-all flex items-center justify-center mt-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00C1FD]" />
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    <span>Log In</span>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => { setView('register'); setErrorMsg(null); }}
                    className="text-[#003f87] dark:text-[#00C1FD] font-bold hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer"
                  >
                    Sign up <span className="opacity-70 text-[10px] ml-0.5 uppercase tracking-wider">Mag-sign up</span>
                  </button>
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink-0 mx-3 text-[11px] font-bold text-slate-400">OR</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Social / Direct Login Buttons */}
              <div className="space-y-2">
                <button 
                  type="button"
                  onClick={() => alert('Ang Google Sign-In ay magiging available sa susunod na update.')}
                  className="w-full h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[#071e27] dark:text-slate-100 font-semibold text-xs rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button 
                  type="button"
                  onClick={() => alert('Ang Facebook Sign-In ay magiging available sa susunod na update.')}
                  className="w-full h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[#071e27] dark:text-slate-100 font-semibold text-xs rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. REGISTRATION VIEW */}
          {view === 'register' && (
            <div className="transition-all duration-300 animate-in fade-in">
              <div className="flex items-center gap-2 mb-4">
                <button 
                  type="button"
                  onClick={() => { setView('login'); setErrorMsg(null); }}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#003f87] transition-colors cursor-pointer"
                  title="Back to login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold text-[#071e27] dark:text-slate-100">
                  Create {role === 'driver' ? 'Driver' : 'Passenger'} Account
                </h2>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="sr-only" htmlFor="reg-name">Full Name</label>
                  <div className="relative group">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003f87] transition-colors" />
                    <input 
                      id="reg-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="sr-only" htmlFor="reg-email">Email Address</label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003f87] transition-colors" />
                    <input 
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="sr-only" htmlFor="reg-phone">Phone Number</label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003f87] transition-colors" />
                    <input 
                      id="reg-phone"
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Phone Number (e.g. 0917 123 4567)"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                  </div>
                </div>

                {/* Driver Specific Fields */}
                {role === 'driver' && (
                  <div className="space-y-2.5 p-3 rounded-xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-200/60 dark:border-slate-700 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Tricycle Plate & Body Number
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text"
                          required
                          value={regPlate}
                          onChange={(e) => setRegPlate(e.target.value.toUpperCase())}
                          placeholder="Plate No. (1234-AB)"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold uppercase focus:border-[#003f87] outline-none"
                        />
                        <input 
                          type="text"
                          required
                          value={regBodyNumber}
                          onChange={(e) => setRegBodyNumber(e.target.value)}
                          placeholder="Body No. (e.g. 0142)"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold focus:border-[#003f87] outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Required for Bauang LGU driver franchise verification.
                    </p>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="sr-only" htmlFor="reg-password">Password</label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003f87] transition-colors" />
                    <input 
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create Password"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-11 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003f87] transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-sm rounded-full shadow-md shadow-[#003f87]/25 active:scale-[0.98] transition-all flex items-center justify-center mt-3 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00C1FD]" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <span>Register</span>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-center text-slate-400 mt-4 leading-normal">
                By registering, you agree to the Bauang Municipal Transport <a href="#terms" onClick={(e) => e.preventDefault()} className="text-[#003f87] underline">Terms of Service</a> and <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-[#003f87] underline">Privacy Policy</a>.
              </p>
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#00C1FD]" />
              <span>Quick Login Shortcuts for Testing:</span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('passenger')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer text-center"
              >
                👤 Passenger
              </button>
              
              <button
                type="button"
                onClick={() => handleQuickFill('driver')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer text-center"
              >
                🛺 Driver
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer text-center"
              >
                🛡️ LGU Admin
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[11px] text-slate-500 font-medium">
          Bauang Municipal Transport Licensing & Regulatory Office • Powered by Supabase
        </div>
      </main>
    </div>
  );
};
