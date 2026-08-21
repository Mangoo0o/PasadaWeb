import { supabase } from '../api/supabaseClient';
import { Complaint, DriverProfile } from '../types/database.types';

export const submitComplaint = async (params: {
  passengerId: string;
  driverId?: string;
  bookingId?: string;
  category: any;
  description: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('complaints')
      .insert({
        passenger_id: params.passengerId,
        driver_id: params.driverId,
        booking_id: params.bookingId,
        category: params.category,
        description: params.description,
        status: 'open',
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchAllComplaints = async (): Promise<Complaint[]> => {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, passenger:profiles!passenger_id(full_name), driver:drivers!driver_id(*, profile:profiles(*))')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((item: any) => ({
      ...item,
      passenger_name: item.passenger?.full_name || 'Anonymous Commuter',
      driver_name: item.driver?.profile?.full_name || 'Kuya Driver',
      driver_body_number: item.driver?.body_number || '0142'
    })) as Complaint[];
  } catch (err) {
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
