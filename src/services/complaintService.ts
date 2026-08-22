import { supabase } from '../api/supabaseClient';
import { Complaint, DriverProfile } from '../types/database.types';

export const submitComplaint = async (params: {
  passengerId: string;
  driverId?: string;
  bookingId?: string;
  category: any;
  description: string;
}): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    if (!params.passengerId || !params.description.trim()) {
      return { success: false, error: 'Kailangan ng impormasyon para sa reklamo.' };
    }

    // 1. Ensure passenger profile exists in public.profiles so foreign key constraint never fails
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', params.passengerId)
        .maybeSingle();

      if (!prof) {
        await supabase.from('profiles').upsert({
          id: params.passengerId,
          role: 'passenger',
          full_name: 'Ka-Pasada Commuter',
          language_pref: 'fil',
          created_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Passenger profile check note:", e);
    }

    // 2. Validate driver_id against public.drivers (set to null if not found)
    let validDriverId: string | null = null;
    if (params.driverId) {
      try {
        const { data: dRow } = await supabase
          .from('drivers')
          .select('id')
          .eq('id', params.driverId)
          .maybeSingle();
        if (dRow) {
          validDriverId = dRow.id;
        }
      } catch (e) {
        console.warn("Driver check note:", e);
      }
    }

    // 3. Validate booking_id against public.bookings (set to null if not found)
    let validBookingId: string | null = null;
    if (params.bookingId) {
      try {
        const { data: bRow } = await supabase
          .from('bookings')
          .select('id')
          .eq('id', params.bookingId)
          .maybeSingle();
        if (bRow) {
          validBookingId = bRow.id;
        }
      } catch (e) {
        console.warn("Booking check note:", e);
      }
    }

    const { data, error } = await supabase
      .from('complaints')
      .insert({
        passenger_id: params.passengerId,
        driver_id: validDriverId,
        booking_id: validBookingId,
        category: params.category || 'overcharging',
        description: params.description.trim(),
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("submitComplaint error:", err);
    return { success: false, error: err.message || 'Hindi naisumite ang reklamo.' };
  }
};

export const fetchAllComplaints = async (): Promise<Complaint[]> => {
  try {
    const [resComplaints, resProfiles, resDrivers] = await Promise.all([
      supabase.from('complaints').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('drivers').select('*, profile:profiles(*)')
    ]);

    if (resComplaints.error || !resComplaints.data) return [];

    const profileMap = new Map<string, any>();
    (resProfiles.data || []).forEach((p: any) => profileMap.set(p.id, p));

    const driverMap = new Map<string, any>();
    (resDrivers.data || []).forEach((d: any) => driverMap.set(d.id, d));

    return resComplaints.data.map((c: any) => {
      const passenger = profileMap.get(c.passenger_id);
      const driver = c.driver_id ? driverMap.get(c.driver_id) : undefined;
      return {
        ...c,
        passenger_name: passenger?.full_name || 'Ka-Pasada Commuter',
        driver_name: driver?.profile?.full_name || 'Kuya Driver',
        driver_body_number: driver?.body_number || '0142',
        passenger,
        driver
      };
    }) as Complaint[];
  } catch (err) {
    console.error("fetchAllComplaints error:", err);
    return [];
  }
};

export const resolveComplaint = async (
  complaintId: string,
  resolutionNotes: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('complaints')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', complaintId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchVerifiedDrivers = async (): Promise<DriverProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*, profile:profiles(*), terminals(name)')
      .order('rating_avg', { ascending: false });

    if (error || !data) return [];
    return data as DriverProfile[];
  } catch (err) {
    return [];
  }
};

export const updateDriverVerification = async (
  driverId: string,
  status: 'verified' | 'rejected'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('drivers')
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq('id', driverId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
