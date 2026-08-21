import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Bike, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone, 
  Hash, 
  AlertCircle,
  CheckCircle2,
  Car
} from 'lucide-react';
import { useAuth, SignUpData } from '../../hooks/useAuth';
import { UserRole, Terminal } from '../../types/database.types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { fetchTerminals } from '../../services/terminalService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
  terminals?: Terminal[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'passenger',
  terminals: propTerminals,
}) => {
  const { t } = useTranslation();
  const { signIn, signUp, isLoading } = useAuth();

  const [terminalsList, setTerminalsList] = useState<Terminal[]>(propTerminals || []);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Driver Fields
  const [tricycleModel, setTricycleModel] = useState('Honda TMX 125');
  const [plateNumber, setPlateNumber] = useState('');
  const [bodyNumber, setBodyNumber] = useState('');
  const [terminalId, setTerminalId] = useState('');

  useEffect(() => {
    if (propTerminals && propTerminals.length > 0) {
      setTerminalsList(propTerminals);
      setTerminalId(propTerminals[0].id);
    } else {
      fetchTerminals().then(terms => {
        setTerminalsList(terms);
        if (terms.length > 0) {
          setTerminalId(terms[0].id);
        }
      });
    }
  }, [propTerminals, isOpen]);

  const resetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setPlateNumber('');
    setBodyNumber('');
  };

  const handleModeToggle = (newMode: 'signin' | 'signup') => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email) {
      setErrorMessage('Pakilagay ang iyong email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Pakilagay ang iyong password.');
      return;
    }

    if (mode === 'signin') {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage('Maligayang pagbabalik! Matagumpay na naka-login.');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } else {
      if (!fullName) {
        setErrorMessage('Pakilagay ang iyong buong pangalan.');
        return;
      }
      if (selectedRole === 'driver' && (!bodyNumber || !plateNumber)) {
        setErrorMessage('Pakilagay ang plaka at TODA body number ng iyong tricycle.');
        return;
      }

      const signUpData: SignUpData = {
        role: selectedRole,
        fullName,
        email,
        password,
        phoneNumber,
        tricycleModel,
        plateNumber,
        bodyNumber,
        terminalId
      };

      const res = await signUp(signUpData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage('Matagumpay na nairehistro ang account! Maaari nang gamitin ang app.');
        setTimeout(() => {
          onClose();
        }, 800);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="space-y-5">
        {/* Header Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-white shadow-md shadow-primary/30 mb-2">
            <Bike className="w-6 h-6 text-secondary-container" />
          </div>
          <h2 className="text-2xl font-extrabold text-on-background">
            {mode === 'signin' ? 'Mag-login sa PasadaGuide' : 'Gumawa ng Bagong Account'}
          </h2>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
            Bauang Civic Smart Transit & Official Fare Transparency
          </p>
        </div>

        {/* Role Selector Tabs (Only on Sign Up) */}
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              Uri ng Account (Role)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('passenger')}
                className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                  selectedRole === 'passenger'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <User className="w-4 h-4 mb-1" />
                <span className="text-xs">Pasahero</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('driver')}
                className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                  selectedRole === 'driver'
                    ? 'border-secondary bg-secondary-container/20 text-on-secondary-container font-bold shadow-sm'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Bike className="w-4 h-4 mb-1" />
                <span className="text-xs">Tsuper / Driver</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                  selectedRole === 'admin'
                    ? 'border-error bg-error/10 text-error font-bold shadow-sm'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1" />
                <span className="text-xs">TODA Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-tertiary-container/20 border border-tertiary-container/40 text-tertiary text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Buong Pangalan (Full Name) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <User className="w-4 h-4 text-on-surface-variant absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="user@example.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Mail className="w-4 h-4 text-on-surface-variant absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Di bababa sa 6 na karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-on-surface-variant hover:text-on-surface"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Numero ng Cellphone (Mobile)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+63 917 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Phone className="w-4 h-4 text-on-surface-variant absolute left-3 top-3" />
              </div>
            </div>
          )}

          {/* Driver Extra Fields */}
          {mode === 'signup' && selectedRole === 'driver' && (
            <div className="p-3.5 bg-secondary-container/10 border border-secondary-container/30 rounded-2xl space-y-3 animate-in fade-in">
              <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Car className="w-4 h-4 text-secondary" />
                <span>Rehistrasyon ng Tricycle sa Bauang TODA</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                    Body Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0142"
                      value={bodyNumber}
                      onChange={(e) => setBodyNumber(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-xs"
                    />
                    <Hash className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                    Plaka (LTO Plate) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ABC 1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Itinalagang Terminal
                </label>
                <select
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-xs font-semibold"
                >
                  {terminalsList.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[50px] bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {isLoading ? 'Nagpoproseso...' : mode === 'signin' ? 'Pumasok (Sign In)' : 'Magrehistro ng Account'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-1">
          {mode === 'signin' ? (
            <button
              type="button"
              onClick={() => handleModeToggle('signup')}
              className="text-xs font-bold text-primary hover:underline"
            >
              Wala pang account? Magrehistro rito
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleModeToggle('signin')}
              className="text-xs font-bold text-primary hover:underline"
            >
              May account na? Mag-login
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
