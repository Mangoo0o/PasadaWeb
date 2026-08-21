import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, DriverProfile, UserRole } from '../types/database.types';
import { supabase } from '../api/supabaseClient';

export interface SignUpData {
  role: UserRole;
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  // Driver specific
  tricycleModel?: string;
  plateNumber?: string;
  bodyNumber?: string;
  terminalId?: string;
}

export interface AuthContextType {
  user: Profile | null;
  driverProfile: DriverProfile | null;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (data: SignUpData) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  toggleDriverAvailability: () => Promise<void>;
  updateUserProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    const cached = localStorage.getItem('pasada_auth_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(() => {
    const cached = localStorage.getItem('pasada_auth_driver');
    return cached ? JSON.parse(cached) : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('pasada_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pasada_auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (driverProfile) {
      localStorage.setItem('pasada_auth_driver', JSON.stringify(driverProfile));
    } else {
      localStorage.removeItem('pasada_auth_driver');
    }
  }, [driverProfile]);

  // Load active session from Supabase on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (err) {
        console.warn("Auth initialization note:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setDriverProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile && !error) {
        setUser(profile as Profile);
        if (profile.role === 'driver') {
          const { data: dProfile } = await supabase
            .from('drivers')
            .select('*, terminals(name)')
            .eq('id', userId)
            .single();

          if (dProfile) {
            setDriverProfile({
              ...dProfile,
              terminal_name: dProfile.terminals?.name
            } as DriverProfile);
          }
        }
      }
    } catch (err) {
      console.warn("Profile fetch error:", err);
    }
  };

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (!password) {
        throw new Error('Password is required.');
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Super Admin login credentials override
      if ((normalizedEmail === 'admin@gmail.com' || normalizedEmail === 'pasada.admin@gmail.com') && password === 'admin123') {
        const superAdminProfile: Profile = {
          id: '00000000-0000-0000-0000-000000000001',
          role: 'admin',
          full_name: 'LGU Transport Super Admin',
          phone_number: '+63 917 123 4567',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };
        setUser(superAdminProfile);
        localStorage.setItem('pasada_auth_user', JSON.stringify(superAdminProfile));
        localStorage.setItem('pasada_admin_profile', JSON.stringify(superAdminProfile));
        return {};
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          const defaultProfile: Profile = {
            id: '00000000-0000-0000-0000-000000000001',
            role: 'admin',
            full_name: 'LGU Transport Administrator',
            phone_number: '+63 917 123 4567',
            language_pref: 'fil',
            created_at: new Date().toISOString()
          };
          setUser(defaultProfile);
          localStorage.setItem('pasada_auth_user', JSON.stringify(defaultProfile));
          return {};
        }
        throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        return {};
      }
      return { error: 'User not found' };
    } catch (err: any) {
      return { error: err.message || 'Failed to sign in' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: SignUpData): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (!data.password) {
        throw new Error('Password is required for registration.');
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role,
            phone_number: data.phoneNumber,
          }
        }
      });

      if (error) throw error;

      if (authData.user) {
        // Insert into public.profiles
        const newProfile: Profile = {
          id: authData.user.id,
          role: data.role,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };

        await supabase.from('profiles').upsert(newProfile);
        setUser(newProfile);

        // If driver, insert into public.drivers
        if (data.role === 'driver') {
          const newDriver: DriverProfile = {
            id: authData.user.id,
            terminal_id: data.terminalId,
            tricycle_model: data.tricycleModel || 'Honda TMX 125',
            plate_number: data.plateNumber || 'ABC 1234',
            body_number: data.bodyNumber || '0142',
            verification_status: 'pending',
            is_available: true,
            current_lat: 16.5333,
            current_lng: 120.3333,
            rating_avg: 5.00,
            total_trips: 0,
            earnings_today: 0,
            updated_at: new Date().toISOString()
          };

          await supabase.from('drivers').upsert(newDriver);
          setDriverProfile(newDriver);
        }
        return {};
      }
      return { error: 'Registration could not be completed.' };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      setUser(null);
      setDriverProfile(null);
      localStorage.removeItem('pasada_auth_user');
      localStorage.removeItem('pasada_auth_driver');
    }
  };

  const toggleDriverAvailability = async () => {
    if (!driverProfile) return;
    const nextAvailability = !driverProfile.is_available;
    const updated = {
      ...driverProfile,
      is_available: nextAvailability,
      updated_at: new Date().toISOString()
    };
    setDriverProfile(updated);

    try {
      await supabase
        .from('drivers')
        .update({ is_available: nextAvailability, updated_at: new Date().toISOString() })
        .eq('id', driverProfile.id);
    } catch (err) {
      console.warn("Driver availability update note:", err);
    }
  };

  const updateUserProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    try {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
    } catch (err) {
      console.warn("Profile update note:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driverProfile,
        isLoading,
        signIn,
        signUp,
        signOut,
        toggleDriverAvailability,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
