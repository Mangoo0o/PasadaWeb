import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Bike, 
  Car, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/database.types';

export const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('passenger');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Driver specific fields
  const [bodyNumber, setBodyNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [tricycleModel, setTricycleModel] = useState('Honda TMX 125');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        }
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Paki-lagay ang iyong buong pangalan.');
          setIsLoading(false);
          return;
        }

        const res = await signUp({
          role,
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          bodyNumber: role === 'driver' ? bodyNumber.trim() : undefined,
          plateNumber: role === 'driver' ? plateNumber.trim() : undefined,
          tricycleModel: role === 'driver' ? tricycleModel : undefined
        });

        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Matagumpay ang pagpaparehistro! Maaari ka nang mag-login.');
          setTimeout(() => {
            setMode('login');
            setSuccessMsg(null);
          }, 1500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'May naganap na error. Pakisubukan muli.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for testing / demonstration
  const handleQuickFill = (targetRole: 'passenger' | 'driver' | 'admin') => {
    setErrorMsg(null);
    setMode('login');
    if (targetRole === 'admin') {
      setEmail('admin@gmail.com');
      setPassword('admin123');
    } else if (targetRole === 'driver') {
      setEmail('driver.juan@gmail.com');
      setPassword('driver123');
    } else {
      setEmail('passenger.maria@gmail.com');
      setPassword('pass12345');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#001D40] via-[#00346F] to-[#00122A] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#00C1FD]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#00346F]/50 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-slate-200/80 dark:border-slate-800 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-[#00346F] to-[#004A99] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none"></div>
          
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-[#00C1FD]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            PasadaGuide
          </h1>
          <p className="text-xs font-semibold text-sky-200 mt-1 uppercase tracking-wider">
            Bauang Municipality Smart Transport
          </p>
        </div>

        {/* Mode Switcher Tabs (Login vs Sign Up) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-black">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-[#00346F] dark:text-[#00C1FD] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mag-login (Sign In)
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); }}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-white dark:bg-slate-900 text-[#00346F] dark:text-[#00C1FD] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mag-rehistro (Sign Up)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
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

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* If Sign Up: Select Role */}
            {mode === 'signup' && (
              <div className="space-y-1.5 mb-2">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Uri ng Account
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('passenger')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      role === 'passenger'
                        ? 'border-[#00346F] bg-sky-50 dark:bg-sky-950/40 text-[#00346F] dark:text-[#00C1FD] font-black'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-xs">Pasahero</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      role === 'driver'
                        ? 'border-[#00346F] bg-sky-50 dark:bg-sky-950/40 text-[#00346F] dark:text-[#00C1FD] font-black'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span className="text-xs">Tricycle Driver</span>
                  </button>
                </div>
              </div>
            )}

            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Buong Pangalan
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00346F] focus:ring-2 focus:ring-[#00346F]/15"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00346F] focus:ring-2 focus:ring-[#00346F]/15"
                />
              </div>
            </div>

            {/* Phone Number (Sign Up only) */}
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Numero ng Telepono
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0917 123 4567"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00346F] focus:ring-2 focus:ring-[#00346F]/15"
                  />
                </div>
              </div>
            )}

            {/* Driver Details (Sign Up for Driver only) */}
            {mode === 'signup' && role === 'driver' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-[10px] font-bold text-[#00346F] dark:text-[#00C1FD] uppercase tracking-wider flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5" />
                  <span>Impormasyon ng Tricycle</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Body Number</label>
                    <input
                      type="text"
                      required
                      value={bodyNumber}
                      onChange={(e) => setBodyNumber(e.target.value)}
                      placeholder="e.g. 0142"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#00346F]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Plate Number</label>
                    <input
                      type="text"
                      required
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="e.g. 1234-AB"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#00346F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block">Model ng Motor</label>
                  <input
                    type="text"
                    value={tricycleModel}
                    onChange={(e) => setTricycleModel(e.target.value)}
                    placeholder="e.g. Honda TMX 125"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#00346F]"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00346F] focus:ring-2 focus:ring-[#00346F]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-[#00346F] to-[#004A99] text-white font-black text-xs sm:text-sm shadow-[0_4px_16px_rgba(0,52,111,0.3)] hover:from-[#00234d] hover:to-[#00346F] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#00C1FD]" />
                  <span>Nagpoproseso...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Pumasok (Sign In)' : 'Kumpletuhin ang Pag-rehistro'}</span>
                  <ArrowRight className="w-4 h-4 text-[#00C1FD]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#00C1FD]" />
              <span>Mabilis na Pag-login para sa Pagsubok:</span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('passenger')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer text-center"
              >
                👤 Pasahero
              </button>
              
              <button
                type="button"
                onClick={() => handleQuickFill('driver')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer text-center"
              >
                🛺 Driver
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer text-center"
              >
                🛡️ LGU Admin
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 font-medium">
          Bauang Municipal Transport Licensing & Regulatory Office • Powered by Supabase
        </div>
      </div>
    </div>
  );
};
