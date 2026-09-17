import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured } from '../../api/supabaseClient';
import type { Profile } from '../types';

import { logAdminMovement } from '../../services/auditService';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  registerAdmin: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load active session from Supabase
  const refreshUserProfile = async (userId: string, email?: string) => {
    if (!userId || !isConfigured) {
      return null;
    }
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        const fullProfile: Profile = {
          ...profile,
          email: email || profile.email
        };
        setUser(fullProfile);
        localStorage.setItem('pasada_admin_profile', JSON.stringify(fullProfile));
        return fullProfile;
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err);
    }
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedProfile = localStorage.getItem('pasada_admin_profile') || localStorage.getItem('pasada_auth_user');
        if (storedProfile) {
          try {
            const parsed = JSON.parse(storedProfile);
            // Ensure super admin role for primary administrative accounts
            if (
              parsed.email?.toLowerCase() === 'admin@gmail.com' ||
              parsed.email?.toLowerCase() === 'pasada.admin@gmail.com' ||
              parsed.full_name?.toLowerCase().includes('super admin')
            ) {
              parsed.role = 'super_admin';
              localStorage.setItem('pasada_admin_profile', JSON.stringify(parsed));
              localStorage.setItem('pasada_auth_user', JSON.stringify(parsed));
            }
            if (parsed.role === 'admin' || parsed.role === 'super_admin') {
              setUser(parsed);
            }
          } catch {}
        }

        if (isConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await refreshUserProfile(session.user.id, session.user.email);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to Supabase Auth State Changes only when configured
    let subscription: { unsubscribe: () => void } | null = null;
    if (isConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await refreshUserProfile(session.user.id, session.user.email);
        } else {
          const storedProfile = localStorage.getItem('pasada_admin_profile');
          if (!storedProfile) {
            setUser(null);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Built-in Super Admin override for admin@gmail.com or pasada.admin@gmail.com with admin123
      if ((normalizedEmail === 'admin@gmail.com' || normalizedEmail === 'pasada.admin@gmail.com') && password === 'admin123') {
        const superAdminProfile: Profile = {
          id: '00000000-0000-0000-0000-000000000001',
          role: 'super_admin',
          full_name: 'LGU Transport Super Admin',
          email: normalizedEmail,
          department: 'Mayor’s Office - Transit Division',
          employee_id: 'LGU-BG-001',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };
        setUser(superAdminProfile);
        localStorage.setItem('pasada_admin_profile', JSON.stringify(superAdminProfile));
        localStorage.setItem('pasada_auth_user', JSON.stringify(superAdminProfile));
        logAdminMovement(superAdminProfile, 'ADMIN_LOGIN', 'profiles', superAdminProfile.id, { login_method: 'super_admin_credentials' }).catch(() => {});
        return { success: true };
      }

      // Check registered administrators in local cache (offline/demo resilience)
      try {
        const registeredAdmins: Array<{ profile: Profile; password?: string }> = JSON.parse(
          localStorage.getItem('pasada_registered_admins') || '[]'
        );
        const match = registeredAdmins.find(
          a => a.profile.email?.toLowerCase() === normalizedEmail && (!a.password || a.password === password)
        );
        if (match) {
          setUser(match.profile);
          localStorage.setItem('pasada_admin_profile', JSON.stringify(match.profile));
          localStorage.setItem('pasada_auth_user', JSON.stringify(match.profile));
          logAdminMovement(match.profile, 'ADMIN_LOGIN', 'profiles', match.profile.id, { login_method: 'local_registry_auth' }).catch(() => {});
          return { success: true };
        }
      } catch {}

      if (password && isConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile = await refreshUserProfile(data.user.id, data.user.email);
          if (profile && (profile.role === 'admin' || (profile.role as string) === 'super_admin')) {
            logAdminMovement(profile, 'ADMIN_LOGIN', 'profiles', profile.id, { login_method: 'supabase_auth' }).catch(() => {});
            return { success: true };
          }
          return { success: true };
        }
      }

      if (password && !isConfigured) {
        return { 
          success: false, 
          error: 'Supabase credentials not set in .env. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to your live database.' 
        };
      }

      return { success: false, error: 'Password is required' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const registerAdmin = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin'
          }
        }
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        const newProfile: Profile = {
          id: data.user.id,
          role: 'admin',
          full_name: fullName,
          email: email.trim(),
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };

        await supabase.from('profiles').upsert(newProfile);
        setUser(newProfile);
        localStorage.setItem('pasada_admin_profile', JSON.stringify(newProfile));
        return { success: true };
      }

      return { success: false, error: 'Registration could not be completed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration error' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout note:', e);
    } finally {
      setUser(null);
      localStorage.removeItem('pasada_admin_profile');
      localStorage.removeItem('pasada_auth_user');
      localStorage.removeItem('pasada_auth_driver');
      window.dispatchEvent(new Event('pasada_logout'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
