import { supabase } from '../api/supabaseClient';
import { Booking, BookingStatus, PaymentMethod } from '../types/database.types';

export const createBookingRequest = async (params: {
  passengerId: string;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedFare: number;
}): Promise<{ data?: Booking; error?: string }> => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const safePassengerId = uuidRegex.test(params.passengerId) ? params.passengerId : null;

    const newBooking: any = {
      origin_name: params.originName,
      origin_lat: params.originLat,
      origin_lng: params.originLng,
      destination_name: params.destinationName,
      destination_lat: params.destinationLat,
      destination_lng: params.destinationLng,
      estimated_distance_km: params.estimatedDistanceKm,
      estimated_duration_min: params.estimatedDurationMin,
      estimated_fare: params.estimatedFare,
      status: 'searching' as BookingStatus,
      payment_method: 'cash' as PaymentMethod,
      created_at: new Date().toISOString()
    };

    if (safePassengerId) {
      newBooking.passenger_id = safePassengerId;
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(newBooking)
      .select('*')
      .single();

    if (error) {
      console.warn('Booking insertion note:', error.message);
      const fallbackBooking: Booking = {
        id: `bk-${Date.now()}`,
        ...newBooking,
        created_at: new Date().toISOString()
      };
      // Store in local storage queue for multi-tab fallback
      try {
        const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
        queue.unshift(fallbackBooking);
        localStorage.setItem('pasada_open_queue', JSON.stringify(queue.slice(0, 20)));
      } catch {}
      window.dispatchEvent(new CustomEvent('pasada_new_dispatch', { detail: fallbackBooking }));
      return { data: fallbackBooking };
    }

    try {
      const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
      queue.unshift(data);
      localStorage.setItem('pasada_open_queue', JSON.stringify(queue.slice(0, 20)));
    } catch {}
    window.dispatchEvent(new CustomEvent('pasada_new_dispatch', { detail: data }));
    return { data: data as Booking };
  } catch (err: any) {
    return { error: err.message || 'Failed to create booking' };
  }
};

export const subscribeToOpenDispatches = (onUpdate: () => void) => {
  const channel = supabase
    .channel('open-dispatches-live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings'
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  const handleLocal = () => {
    onUpdate();
  };

  window.addEventListener('pasada_new_dispatch', handleLocal);
  window.addEventListener('storage', handleLocal);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('pasada_new_dispatch', handleLocal);
    window.removeEventListener('storage', handleLocal);
  };
};

export const subscribeToBooking = (
  bookingId: string, 
  onUpdate: (booking: Booking) => void
) => {
  const channel = supabase
    .channel(`booking-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      },
      async () => {
        const { data } = await supabase
          .from('bookings')
          .select('*, driver:drivers(*, profile:profiles(*))')
          .eq('id', bookingId)
          .single();
        if (data) {
          onUpdate(data as Booking);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus,
  driverId?: string,
  finalFare?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updates: any = { status };
    if (driverId) updates.driver_id = driverId;
    if (finalFare) updates.final_fare = finalFare;
    if (status === 'driver_assigned') updates.accepted_at = new Date().toISOString();
    if (status === 'driver_arrived') updates.arrived_at = new Date().toISOString();
    if (status === 'in_transit') updates.started_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchUserBookings = async (userId: string, isDriver = false): Promise<Booking[]> => {
  try {
    const column = isDriver ? 'driver_id' : 'passenger_id';
    const { data, error } = await supabase
      .from('bookings')
      .select('*, driver:drivers(*, profile:profiles(*)), passenger:profiles(*)')
      .eq(column, userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Booking[];
  } catch (err) {
    return [];
  }
};

export const fetchOpenDispatches = async (): Promise<Booking[]> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'searching')
      .order('created_at', { ascending: false });

    const serverBookings: Booking[] = (!error && data) ? (data as Booking[]) : [];
    
    // Read local queue for instant tab sync
    let localQueue: Booking[] = [];
    try {
      localQueue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]')
        .filter((b: Booking) => b.status === 'searching');
    } catch {}

    // Merge and deduplicate
    const map = new Map<string, Booking>();
    [...serverBookings, ...localQueue].forEach(b => {
      if (b && b.id && !map.has(b.id)) {
        map.set(b.id, b);
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  } catch (err) {
    return [];
  }
};

export const fetchActiveDrivers = async (): Promise<Array<{ id: string; lat: number; lng: number; bodyNumber?: string }>> => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, current_lat, current_lng, body_number')
      .eq('is_available', true);

    if (error || !data) return [];
    return data
      .filter((d: any) => d.current_lat && d.current_lng)
      .map((d: any) => ({
        id: d.id,
        lat: d.current_lat,
        lng: d.current_lng,
        bodyNumber: d.body_number,
      }));
  } catch (err) {
    return [];
  }
};

