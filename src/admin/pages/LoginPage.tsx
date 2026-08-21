import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AdminAuthContext';

export const LoginPage: React.FC = () => {
  const { login, registerAdmin, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (activeTab === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name & title.');
        return;
      }

      const res = await registerAdmin(email, password, fullName);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create Super Admin account.');
      } else {
        setSuccessMessage('Super Admin account created successfully! Logging in...');
      }
    } else {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials or login failed.');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #00346F 0%, #001228 100%)',
      padding: 24,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Blur Circles */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'rgba(2, 132, 199, 0.15)',
        filter: 'blur(100px)',
        top: -100,
        right: -100,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'rgba(0, 193, 253, 0.1)',
        filter: 'blur(90px)',
        bottom: -80,
        left: -80,
        pointerEvents: 'none'
      }} />

      {/* Main Glass Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #00346F 0%, #00C1FD 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0, 52, 111, 0.25)',
            marginBottom: 12
          }}>
            <ShieldCheck size={28} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#00346F', letterSpacing: '-0.02em', margin: 0 }}>
            PasadaGuide
          </h1>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#006688', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            LGU Transport Board Portal
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: '#e2e8f0',
          borderRadius: 12,
          padding: 4,
          marginBottom: 20
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: 9,
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'signin' ? '#ffffff' : 'transparent',
              color: activeTab === 'signin' ? '#00346F' : '#64748b',
              boxShadow: activeTab === 'signin' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Official Sign In
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: 9,
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'signup' ? '#ffffff' : 'transparent',
              color: activeTab === 'signup' ? '#00346F' : '#64748b',
              boxShadow: activeTab === 'signup' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Create Super Admin
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '0.8rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert Box */}
        {successMessage && (
          <div style={{
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '0.8rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeTab === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Full Name & Official Title
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Engr. Juan Dela Cruz (BPLO/MITO)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
              Official Gov Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="email"
                required
                placeholder="admin@bauang.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 36px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 2
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {activeTab === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #00346F 0%, #004A99 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 0',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
              boxShadow: '0 4px 12px rgba(0, 52, 111, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{loading ? 'Authenticating...' : activeTab === 'signin' ? 'Sign In to Dashboard' : 'Create Super Admin Account'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
