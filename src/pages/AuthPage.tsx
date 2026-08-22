import React, { useState, useRef, useEffect } from 'react';
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
  Bike,
  GraduationCap,
  HeartHandshake,
  Accessibility,
  ChevronDown,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/database.types';

export const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  
  const [view, setView] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [passengerType, setPassengerType] = useState<'regular' | 'student' | 'senior' | 'pwd'>('regular');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PASSENGER_TYPE_OPTIONS = [
    {
      id: 'regular',
      label: 'Regular Passenger',
      sublabel: 'Standard Tariff Rate',
      icon: User,
      badge: null
    },
    {
      id: 'student',
      label: 'Student / Estudyante',
      sublabel: 'With valid student ID',
      icon: GraduationCap,
      badge: '20% OFF'
    },
    {
      id: 'senior',
      label: 'Senior Citizen',
      sublabel: '60 years old & above',
      icon: HeartHandshake,
      badge: '20% OFF'
    },
    {
      id: 'pwd',
      label: 'Person with Disability (PWD)',
      sublabel: 'With valid PWD card',
      icon: Accessibility,
      badge: '20% OFF'
    }
  ] as const;

  const currentOption = PASSENGER_TYPE_OPTIONS.find(o => o.id === passengerType) || PASSENGER_TYPE_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

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
        passengerType: role === 'passenger' ? passengerType : 'regular',
        plateNumber: role === 'driver' ? regPlate.trim() : undefined,
        bodyNumber: role === 'driver' ? regBodyNumber.trim() : undefined,
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

  return (
    <div className="bg-[#f4faff] min-h-screen min-h-[100dvh] w-full text-[#071e27] antialiased relative overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 py-8 sm:py-12 selection:bg-[#0056b3] selection:text-white font-sans">
      
      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#0056b3]/15 to-transparent pointer-events-none -z-10"></div>
      <div className="fixed -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[#0056b3]/10 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed -bottom-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[#fcd400]/10 blur-3xl pointer-events-none -z-10"></div>

      <main className="w-full max-w-md px-1 sm:px-3 py-2 sm:py-6 relative z-10 my-auto">
        
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
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 p-6 sm:p-7 border border-white/60 dark:border-slate-800 relative">
          
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
                  Create Account
                </h2>
              </div>

              {/* Role Selector: Passenger vs Driver */}
              <div className="bg-[#d5ecf8] dark:bg-slate-800 rounded-full p-1 flex mb-4 relative">
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
                      placeholder="Full Name (e.g. Juan Dela Cruz)"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm font-semibold text-[#071e27] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all outline-none h-12"
                    />
                  </div>
                </div>

                {/* PASSENGER ONLY: Custom Modern Dropdown */}
                {role === 'passenger' && (
                  <div className="relative" ref={dropdownRef}>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Passenger Classification
                    </label>

                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full h-12 px-3.5 bg-white dark:bg-slate-800 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isDropdownOpen
                          ? 'border-[#003f87] ring-2 ring-[#003f87]/15 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-slate-700 text-[#003f87] dark:text-[#00C1FD] flex items-center justify-center shrink-0">
                          <CurrentIcon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs sm:text-sm font-bold text-[#071e27] dark:text-slate-100 block truncate">
                            {currentOption.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {currentOption.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {currentOption.badge}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#003f87]' : ''}`} />
                      </div>
                    </button>

                    {/* Popover Menu */}
                    {isDropdownOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {PASSENGER_TYPE_OPTIONS.map((opt) => {
                          const isSelected = passengerType === opt.id;
                          const ItemIcon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPassengerType(opt.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-50 dark:bg-sky-950/50 text-[#003f87] dark:text-[#00C1FD]'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected 
                                    ? 'bg-[#003f87] text-white dark:bg-[#00C1FD] dark:text-slate-900' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  <ItemIcon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold block">{opt.label}</span>
                                  <span className="text-[10px] text-slate-400 block">{opt.sublabel}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {opt.badge && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                    {opt.badge}
                                  </span>
                                )}
                                {isSelected && <Check className="w-4 h-4 text-[#003f87] dark:text-[#00C1FD]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {passengerType !== 'regular' && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1.5 ml-1 flex items-center gap-1 animate-in fade-in">
                        <span>✓ 20% discount will automatically apply to all your trips.</span>
                      </p>
                    )}
                  </div>
                )}

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

                {/* DRIVER ONLY: Tricycle Plate & Body Number in TWO SEPARATE FULL ROWS */}
                {role === 'driver' && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-200/60 dark:border-slate-700 animate-in fade-in">
                    <div className="text-[10px] font-bold text-[#003f87] dark:text-[#00C1FD] uppercase tracking-wider flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5" />
                      <span>Impormasyon ng Tricycle</span>
                    </div>

                    {/* Row 1: Tricycle Plate Number */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Tricycle Plate Number
                      </label>
                      <input 
                        type="text"
                        required
                        value={regPlate}
                        onChange={(e) => setRegPlate(e.target.value.toUpperCase())}
                        placeholder="e.g. 1234-AB / ABC-1234"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold uppercase focus:border-[#003f87] outline-none"
                      />
                    </div>

                    {/* Row 2: Tricycle Body Number */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Tricycle Body Number
                      </label>
                      <input 
                        type="text"
                        required
                        value={regBodyNumber}
                        onChange={(e) => setRegBodyNumber(e.target.value)}
                        placeholder="e.g. 0142 (Bauang TODA Body No.)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold focus:border-[#003f87] outline-none"
                      />
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium">
                      Kinakailangan para sa verification ng Bauang LGU Transport Board.
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
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[11px] text-slate-500 font-medium">
          Bauang Municipal Transport Licensing & Regulatory Office • Powered by Supabase
        </div>
      </main>
    </div>
  );
};
