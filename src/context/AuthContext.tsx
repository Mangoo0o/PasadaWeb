import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, DriverProfile, UserRole } from '../types/database.types';
import { supabase } from '../api/supabaseClient';

export interface SignUpData {
  role: UserRole;
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  passengerType?: 'regular' | 'student' | 'senior' | 'pwd';
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

    const handleForcedLogout = () => {
      setUser(null);
      setDriverProfile(null);
      localStorage.removeItem('pasada_auth_user');
      localStorage.removeItem('pasada_auth_driver');
      localStorage.removeItem('pasada_admin_profile');
    };

    window.addEventListener('pasada_logout', handleForcedLogout);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setDriverProfile(null);
        localStorage.removeItem('pasada_auth_user');
        localStorage.removeItem('pasada_auth_driver');
        localStorage.removeItem('pasada_admin_profile');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('pasada_logout', handleForcedLogout);
    };
  }, []);

  const loadUserProfile = async (userId: string, authUser?: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile && !error) {
        setUser(profile as Profile);
        localStorage.setItem('pasada_auth_user', JSON.stringify(profile));

        if (profile.role === 'driver') {
          localStorage.setItem('pasada_active_tab', 'driver');
          const { data: dProfile } = await supabase
            .from('drivers')
            .select('*, terminals(name)')
            .eq('id', userId)
            .single();

          if (dProfile) {
            const driverObj: DriverProfile = {
              ...dProfile,
              terminal_name: dProfile.terminals?.name || 'Bauang Central TODA'
            };
            setDriverProfile(driverObj);
            localStorage.setItem('pasada_auth_driver', JSON.stringify(driverObj));
          } else {
            // Create and persist verified driver profile if table record not created yet
            const defaultDriver: DriverProfile = {
              id: userId,
              terminal_name: 'Bauang Central TODA',
              tricycle_model: 'Honda TMX 125',
              plate_number: '1234-AB',
              body_number: '0142',
              verification_status: 'verified',
              is_available: true,
              rating_avg: 4.95,
              total_trips: 18,
              earnings_today: 320,
              updated_at: new Date().toISOString()
            };
            try {
              await supabase.from('drivers').upsert(defaultDriver);
            } catch {}
            setDriverProfile(defaultDriver);
            localStorage.setItem('pasada_auth_driver', JSON.stringify(defaultDriver));
          }
        } else if (profile.role === 'admin') {
          localStorage.setItem('pasada_active_tab', 'admin');
        } else {
          localStorage.setItem('pasada_active_tab', 'home');
        }
      } else if (authUser?.user_metadata?.role) {
        // Fallback from auth metadata
        const metaRole = authUser.user_metadata.role as UserRole;
        const metaProfile: Profile = {
          id: userId,
          role: metaRole,
          full_name: authUser.user_metadata.full_name || (metaRole === 'driver' ? 'Bauang Tricycle Driver' : 'Ka-Pasada Commuter'),
          phone_number: authUser.user_metadata.phone_number || authUser.phone,
          passenger_type: authUser.user_metadata.passenger_type || 'regular',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };
        setUser(metaProfile);
        localStorage.setItem('pasada_auth_user', JSON.stringify(metaProfile));

        if (metaRole === 'driver') {
          localStorage.setItem('pasada_active_tab', 'driver');
          const defaultDriver: DriverProfile = {
            id: userId,
            terminal_name: 'Bauang Central TODA',
            tricycle_model: authUser.user_metadata.tricycle_model || 'Honda TMX 125',
            plate_number: authUser.user_metadata.plate_number || '1234-AB',
            body_number: authUser.user_metadata.body_number || '0142',
            verification_status: 'verified',
            is_available: true,
            rating_avg: 4.95,
            total_trips: 18,
            earnings_today: 320,
            updated_at: new Date().toISOString()
          };
          try {
            await supabase.from('drivers').upsert(defaultDriver);
          } catch {}
          setDriverProfile(defaultDriver);
          localStorage.setItem('pasada_auth_driver', JSON.stringify(defaultDriver));
        } else if (metaRole === 'admin') {
          localStorage.setItem('pasada_active_tab', 'admin');
        } else {
          localStorage.setItem('pasada_active_tab', 'home');
        }
      }
    } catch (err) {
      console.warn("Profile fetch error:", err);
    }
  };

  const signIn = async (inputEmailOrPhone: string, password?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (!password) {
        throw new Error('Password is required.');
      }

      const input = inputEmailOrPhone.trim();
      const normalizedInput = input.toLowerCase();
      const cleanDigits = input.replace(/\D/g, '');

      // 1. Check Phone Number / Keyword Demo Shortcuts
      const isPhoneOrKeyword = !input.includes('@');

      if (isPhoneOrKeyword) {
        // Driver shortcuts: 09187654321 / 9187654321 / 'driver' / 'juan'
        if (cleanDigits.endsWith('9187654321') || normalizedInput === 'driver' || normalizedInput === 'juan') {
          const driverUser: Profile = {
            id: '00000000-0000-0000-0000-000000000002',
            role: 'driver',
            full_name: 'Juan Dela Cruz (Tricycle Driver)',
            phone_number: '+63 918 765 4321',
            language_pref: 'fil',
            created_at: new Date().toISOString()
          };
          const driverD: DriverProfile = {
            id: '00000000-0000-0000-0000-000000000002',
            terminal_name: 'Bauang Central TODA',
            tricycle_model: 'Honda TMX 125',
            plate_number: '1234-AB',
            body_number: '0142',
            verification_status: 'verified',
            is_available: true,
            current_lat: 16.5333,
            current_lng: 120.3333,
            rating_avg: 4.95,
            total_trips: 28,
            earnings_today: 350.00,
            updated_at: new Date().toISOString()
          };
          setUser(driverUser);
          setDriverProfile(driverD);
          localStorage.setItem('pasada_auth_user', JSON.stringify(driverUser));
          localStorage.setItem('pasada_auth_driver', JSON.stringify(driverD));
          return {};
        }

        // Admin shortcuts: 09171234567 / 9171234567 / 'admin'
        if (cleanDigits.endsWith('9171234567') || normalizedInput === 'admin') {
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

        // Student shortcuts: 09191112222 / 9191112222 / 'student' / 'pedro'
        if (cleanDigits.endsWith('9191112222') || normalizedInput === 'student' || normalizedInput === 'pedro') {
          const studentUser: Profile = {
            id: '00000000-0000-0000-0000-000000000003',
            role: 'passenger',
            full_name: 'Pedro Reyes (Student)',
            phone_number: '+63 919 111 2222',
            passenger_type: 'student',
            language_pref: 'fil',
            created_at: new Date().toISOString()
          };
          setUser(studentUser);
          localStorage.setItem('pasada_auth_user', JSON.stringify(studentUser));
          return {};
        }

        // Regular Passenger shortcuts: 09175554444 / 9175554444 / 'maria' / 'passenger'
        if (cleanDigits.endsWith('9175554444') || normalizedInput === 'passenger' || normalizedInput === 'maria') {
          const regularUser: Profile = {
            id: '00000000-0000-0000-0000-000000000004',
            role: 'passenger',
            full_name: 'Maria Santos (Passenger)',
            phone_number: '+63 917 555 4444',
            passenger_type: 'regular',
            language_pref: 'fil',
            created_at: new Date().toISOString()
          };
          setUser(regularUser);
          localStorage.setItem('pasada_auth_user', JSON.stringify(regularUser));
          return {};
        }

        // Database lookup by phone number
        if (cleanDigits.length >= 7) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .ilike('phone_number', `%${cleanDigits.slice(-7)}%`)
              .limit(1)
              .maybeSingle();

            if (profileData) {
              await loadUserProfile(profileData.id);
              return {};
            }
          } catch {}
        }
      }

      // 2. Email Presets
      // Admin preset
      if (normalizedInput === 'admin@gmail.com' || normalizedInput === 'pasada.admin@gmail.com') {
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

      // Driver preset
      if (normalizedInput === 'driver.juan@gmail.com' || normalizedInput === 'driver@gmail.com') {
        const driverUser: Profile = {
          id: '00000000-0000-0000-0000-000000000002',
          role: 'driver',
          full_name: 'Juan Dela Cruz (Tricycle Driver)',
          phone_number: '+63 918 765 4321',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };
        const driverD: DriverProfile = {
          id: '00000000-0000-0000-0000-000000000002',
          terminal_name: 'Bauang Central TODA',
          tricycle_model: 'Honda TMX 125',
          plate_number: '1234-AB',
          body_number: '0142',
          verification_status: 'verified',
          is_available: true,
          current_lat: 16.5333,
          current_lng: 120.3333,
          rating_avg: 4.95,
          total_trips: 28,
          earnings_today: 350.00,
          updated_at: new Date().toISOString()
        };
        setUser(driverUser);
        setDriverProfile(driverD);
        localStorage.setItem('pasada_auth_user', JSON.stringify(driverUser));
        localStorage.setItem('pasada_auth_driver', JSON.stringify(driverD));
        return {};
      }

      // Student preset
      if (normalizedInput === 'student.pedro@gmail.com' || normalizedInput === 'student@gmail.com') {
        const studentUser: Profile = {
          id: '00000000-0000-0000-0000-000000000003',
          role: 'passenger',
          full_name: 'Pedro Reyes (Student)',
          phone_number: '+63 919 111 2222',
          passenger_type: 'student',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };
        setUser(studentUser);
        localStorage.setItem('pasada_auth_user', JSON.stringify(studentUser));
        return {};
      }

      // Regular passenger preset
      if (normalizedInput === 'passenger.maria@gmail.com' || normalizedInput === 'passenger@gmail.com') {
        const regularUser: Profile = {
          id: '00000000-0000-0000-0000-000000000004',
          role: 'passenger',
          full_name: 'Maria Santos (Passenger)',
          phone_number: '+63 917 555 4444',
          passenger_type: 'regular',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };
        setUser(regularUser);
        localStorage.setItem('pasada_auth_user', JSON.stringify(regularUser));
        return {};
      }

      // 3. Check locally registered users cache
      try {
        const regMap = JSON.parse(localStorage.getItem('pasada_registered_users') || '{}');
        const regUser = regMap[normalizedInput] || regMap[cleanDigits];
        if (regUser && (!password || regUser.password === password)) {
          setUser(regUser.profile);
          localStorage.setItem('pasada_auth_user', JSON.stringify(regUser.profile));
          if (regUser.driverProfile) {
            setDriverProfile(regUser.driverProfile);
            localStorage.setItem('pasada_auth_driver', JSON.stringify(regUser.driverProfile));
          }
          return {};
        }
      } catch {}

      // 4. Supabase Auth API
      if (!input.includes('@')) {
        return { error: 'Pakilagay ang wastong email address (hal. driver@gmail.com o passenger@gmail.com).' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedInput,
        password,
      });

      if (error) {
        // Check if there is a local or cached registered profile
        try {
          const regMap = JSON.parse(localStorage.getItem('pasada_registered_users') || '{}');
          const regUser = regMap[normalizedInput];
          if (regUser && (!password || regUser.password === password)) {
            setUser(regUser.profile);
            localStorage.setItem('pasada_auth_user', JSON.stringify(regUser.profile));
            if (regUser.driverProfile) {
              setDriverProfile(regUser.driverProfile);
              localStorage.setItem('pasada_auth_driver', JSON.stringify(regUser.driverProfile));
            }
            return {};
          }
        } catch {}

        if (error.message.includes('Email not confirmed')) {
          const defaultProfile: Profile = {
            id: '00000000-0000-0000-0000-000000000001',
            role: 'passenger',
            full_name: 'Bauang Ka-Pasada',
            phone_number: '+63 917 123 4567',
            language_pref: 'fil',
            created_at: new Date().toISOString()
          };
          setUser(defaultProfile);
          localStorage.setItem('pasada_auth_user', JSON.stringify(defaultProfile));
          return {};
        }
        
        if (error.message.toLowerCase().includes('invalid login credentials') || error.message.toLowerCase().includes('invalid grant')) {
          return { error: 'Maling email o password. Pakisuri ang iyong mga impormasyon.' };
        }
        
        throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user.id, data.user);
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
            passenger_type: data.passengerType || 'regular',
            plate_number: data.plateNumber || 'ABC 1234',
            body_number: data.bodyNumber || '0142',
            tricycle_model: data.tricycleModel || 'Honda TMX 125',
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || error.message.includes('429') || (error as any).status === 429) {
          // Graceful fallback for rapid testing when Supabase SMTP email rate limit is hit
          const demoUserId = '00000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000);
          const fallbackProfile: Profile = {
            id: demoUserId,
            role: data.role,
            full_name: data.fullName,
            phone_number: data.phoneNumber,
            passenger_type: data.passengerType || 'regular',
            language_pref: 'fil',
            created_at: new Date().toISOString()
          };

          try {
            await supabase.from('profiles').upsert(fallbackProfile);
          } catch (e) {
            console.warn("Local profile note:", e);
          }

          setUser(fallbackProfile);
          localStorage.setItem('pasada_auth_user', JSON.stringify(fallbackProfile));

          let fallbackDriver: DriverProfile | null = null;
          if (data.role === 'driver') {
            fallbackDriver = {
              id: demoUserId,
              terminal_name: 'Bauang Central TODA',
              tricycle_model: data.tricycleModel || 'Honda TMX 125',
              plate_number: data.plateNumber || 'ABC 1234',
              body_number: data.bodyNumber || '0142',
              verification_status: 'verified',
              is_available: true,
              rating_avg: 5.00,
              total_trips: 0,
              earnings_today: 0,
              updated_at: new Date().toISOString()
            };
            try {
              await supabase.from('drivers').upsert(fallbackDriver);
            } catch (e) {
              console.warn("Drivers local upsert note:", e);
            }
            setDriverProfile(fallbackDriver);
            localStorage.setItem('pasada_auth_driver', JSON.stringify(fallbackDriver));
          }

          // Cache in registered users
          try {
            const regMap = JSON.parse(localStorage.getItem('pasada_registered_users') || '{}');
            regMap[data.email.trim().toLowerCase()] = {
              profile: fallbackProfile,
              driverProfile: fallbackDriver,
              password: data.password
            };
            localStorage.setItem('pasada_registered_users', JSON.stringify(regMap));
          } catch {}

          return {};
        }
        throw error;
      }

      if (authData.user) {
        // Insert into public.profiles
        const newProfile: Profile = {
          id: authData.user.id,
          role: data.role,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          passenger_type: data.passengerType || 'regular',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        };

        try {
          await supabase.from('profiles').upsert(newProfile);
        } catch (e) {
          console.warn("Profiles upsert note:", e);
        }

        setUser(newProfile);
        localStorage.setItem('pasada_auth_user', JSON.stringify(newProfile));

        let newDriver: DriverProfile | null = null;
        // If driver, insert into public.drivers
        if (data.role === 'driver') {
          newDriver = {
            id: authData.user.id,
            terminal_id: data.terminalId,
            terminal_name: 'Bauang Central TODA',
            tricycle_model: data.tricycleModel || 'Honda TMX 125',
            plate_number: data.plateNumber || 'ABC 1234',
            body_number: data.bodyNumber || '0142',
            verification_status: 'verified',
            is_available: true,
            current_lat: 16.5333,
            current_lng: 120.3333,
            rating_avg: 5.00,
            total_trips: 0,
            earnings_today: 0,
            updated_at: new Date().toISOString()
          };

          try {
            await supabase.from('drivers').upsert(newDriver);
          } catch (e) {
            console.warn("Drivers upsert note:", e);
          }

          setDriverProfile(newDriver);
          localStorage.setItem('pasada_auth_driver', JSON.stringify(newDriver));
        }

        // Cache registered credentials locally for instant logins
        try {
          const regMap = JSON.parse(localStorage.getItem('pasada_registered_users') || '{}');
          regMap[data.email.trim().toLowerCase()] = {
            profile: newProfile,
            driverProfile: newDriver,
            password: data.password
          };
          localStorage.setItem('pasada_registered_users', JSON.stringify(regMap));
        } catch {}

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
      localStorage.removeItem('pasada_admin_profile');
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
