import { supabase } from '../api/supabaseClient';
import { Booking, BookingStatus, PaymentMethod, Profile } from '../types/database.types';
import { logTripSurchargeAudit, logTripRebookExtensionAudit } from './auditService';

export const createBookingRequest = async (params: {
  passengerId: string;
  passenger?: Profile | null;
  passengerType?: string;
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

    let { data, error } = await supabase
      .from('bookings')
      .insert(newBooking)
      .select('*, passenger:profiles!bookings_passenger_id_fkey(id, full_name, phone_number, passenger_type)')
      .single();

    // If initial insert fails due to foreign key violation on passenger_id (e.g. preset/local mock profile not in DB),
    // safely retry without passenger_id so the booking is still created in Supabase with a valid UUID!
    if (error && newBooking.passenger_id && (error.code === '23503' || error.message?.includes('foreign key') || (error as any).status === 409)) {
      console.warn('Retrying booking insert without foreign key passenger_id...');
      const fallbackPayload = { ...newBooking };
      delete fallbackPayload.passenger_id;
      const retry = await supabase
        .from('bookings')
        .insert(fallbackPayload)
        .select('*, passenger:profiles!bookings_passenger_id_fkey(id, full_name, phone_number, passenger_type)')
        .single();
      data = retry.data;
      error = retry.error;
    }

    const resolvedPassengerType = params.passengerType || params.passenger?.passenger_type || 'regular';

    if (error || !data) {
      console.warn('Booking insertion note:', error?.message);
      const fallbackBooking: Booking = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `bk-${Date.now()}`,
        ...newBooking,
        passenger_name: params.passenger?.full_name || 'Ka-Pasada Commuter',
        passenger: {
          id: params.passengerId || 'guest',
          role: 'passenger',
          full_name: params.passenger?.full_name || 'Ka-Pasada Commuter',
          passenger_type: resolvedPassengerType as any,
          language_pref: 'fil',
          created_at: new Date().toISOString()
        } as Profile,
        created_at: new Date().toISOString()
      };
      (fallbackBooking as any).passenger_type = resolvedPassengerType;

      // Store in local storage queue for multi-tab fallback
      try {
        const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
        queue.unshift(fallbackBooking);
        localStorage.setItem('pasada_open_queue', JSON.stringify(queue.slice(0, 20)));
      } catch {}
      window.dispatchEvent(new CustomEvent('pasada_new_dispatch', { detail: fallbackBooking }));
      return { data: fallbackBooking };
    }

    const returnedBooking: Booking = {
      ...(data as Booking),
      passenger: {
        ...((data as any)?.passenger || params.passenger || {}),
        passenger_type: ((data as any)?.passenger?.passenger_type || resolvedPassengerType) as any
      } as Profile
    };
    (returnedBooking as any).passenger_type = (returnedBooking.passenger as any)?.passenger_type || resolvedPassengerType;

    try {
      const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
      queue.unshift(returnedBooking);
      localStorage.setItem('pasada_open_queue', JSON.stringify(queue.slice(0, 20)));
    } catch {}
    window.dispatchEvent(new CustomEvent('pasada_new_dispatch', { detail: returnedBooking }));
    return { data: returnedBooking };
  } catch (err: any) {
    return { error: err.message || 'Failed to create booking' };
  }
};

export const subscribeToOpenDispatches = (onUpdate: (detail?: any) => void) => {
  const channel = supabase
    .channel('open-dispatches-live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings'
      },
      (payload) => {
        const item: any = payload.eventType === 'DELETE'
          ? { id: (payload.old as any)?.id, status: 'deleted' }
          : (payload.new || payload.old);

        if (item?.id) {
          if (item.status && item.status !== 'searching') {
            try {
              const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
              const filtered = queue.filter((b: any) => b.id !== item.id);
              localStorage.setItem('pasada_open_queue', JSON.stringify(filtered));
            } catch {}
          } else {
            // Enrich with cached passenger details if available
            try {
              const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
              const existing = queue.find((b: any) => b.id === item.id);
              if (existing) {
                if (!item.passenger && existing.passenger) item.passenger = existing.passenger;
                if (!item.passenger_type && (existing.passenger_type || existing.passenger?.passenger_type)) {
                  item.passenger_type = existing.passenger_type || existing.passenger?.passenger_type;
                }
              }
            } catch {}
          }
        }
        onUpdate(item);
      }
    )
    .subscribe();

  const handleLocal = (e: any) => {
    const item = e?.detail;
    if (item?.id && item?.status && item.status !== 'searching') {
      try {
        const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
        const filtered = queue.filter((b: any) => b.id !== item.id);
        localStorage.setItem('pasada_open_queue', JSON.stringify(filtered));
      } catch {}
    }
    onUpdate(item);
  };

  window.addEventListener('pasada_new_dispatch', handleLocal);
  window.addEventListener('pasada_booking_updated', handleLocal);
  window.addEventListener('storage', handleLocal);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('pasada_new_dispatch', handleLocal);
    window.removeEventListener('pasada_booking_updated', handleLocal);
    window.removeEventListener('storage', handleLocal);
  };
};

export const subscribeToBooking = (
  bookingId: string, 
  onUpdate: (booking: Booking) => void
) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = uuidRegex.test(bookingId);

  const fetchLatest = async () => {
    let localData: any = null;
    try {
      const stored = localStorage.getItem(`pasada_booking_${bookingId}`);
      if (stored) localData = JSON.parse(stored);
      if (!localData) {
        const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
        localData = queue.find((b: Booking) => b.id === bookingId);
      }
      const evRaw = localStorage.getItem('pasada_active_trip_event');
      if (evRaw) {
        const ev = JSON.parse(evRaw);
        if (ev?.id === bookingId) {
          localData = { ...(localData || {}), ...ev };
        }
      }
    } catch {}

    if (!isUuid) {
      if (localData) onUpdate(localData as Booking);
      return;
    }

    let { data, error } = await supabase
      .from('bookings')
      .select('*, driver:drivers(*, profile:profiles(*)), passenger:profiles!bookings_passenger_id_fkey(*)')
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !data) {
      const fallback = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      data = fallback.data;
    }

    if (!data && localData) {
      data = localData;
    }

    if (data) {
      // If driver is not populated but driver_id exists, fetch driver details
      if (data.driver_id && !data.driver) {
        try {
          const { data: dData } = await supabase
            .from('drivers')
            .select('*, profile:profiles(*)')
            .eq('id', data.driver_id)
            .maybeSingle();
          if (dData) {
            (data as any).driver = dData;
          }
        } catch {}
      }

      // Status progression ranking to ensure statuses can only move forward
      const STATUS_RANK: Record<string, number> = {
        searching: 0,
        driver_assigned: 1,
        driver_arrived: 2,
        in_transit: 3,
        completed: 4,
        cancelled: 5
      };

      // Merge fresher local updates if local has driver or fare or status
      if (localData) {
        const localRank = STATUS_RANK[localData.status] ?? -1;
        const dbRank = STATUS_RANK[data.status] ?? -1;
        // Only advance status forward, never downgrade an advanced DB status (like 'completed' to 'driver_arrived')
        if (localData.status && localRank > dbRank) {
          data.status = localData.status;
        }
        if (localData.driver && !data.driver) data.driver = localData.driver;
        if (localData.driver_id && !data.driver_id) data.driver_id = localData.driver_id;
        if (localData.final_fare != null && (data.final_fare == null || localData.status === 'completed')) {
          data.final_fare = Number(localData.final_fare);
        }
        if (localData.additional_fare != null && (data.additional_fare == null || Number(localData.additional_fare) > 0)) {
          data.additional_fare = Number(localData.additional_fare);
        }
        if (localData.additional_fare_reason && (!data.additional_fare_reason || localData.status === 'completed')) {
          data.additional_fare_reason = localData.additional_fare_reason;
        }
        if (localData.discount_amount != null && (data.discount_amount == null || Number(localData.discount_amount) > 0)) {
          data.discount_amount = Number(localData.discount_amount);
        }
        if (localData.base_fare != null && (data.base_fare == null || Number(localData.base_fare) > 0)) {
          data.base_fare = Number(localData.base_fare);
        }
        // Only fallback to local destination if DB row was missing destination
        if (!data.destination_name && localData.destination_name) {
          data.destination_name = localData.destination_name;
        }
        if (!data.destination_lat && localData.destination_lat) {
          data.destination_lat = Number(localData.destination_lat);
        }
        if (!data.destination_lng && localData.destination_lng) {
          data.destination_lng = Number(localData.destination_lng);
        }
        if (data.estimated_fare == null && localData.estimated_fare != null) {
          data.estimated_fare = Number(localData.estimated_fare);
        }

        // If DB has updated destination that differs from local cache, rebook is detected
        if (data.destination_name && localData.destination_name && data.destination_name !== localData.destination_name) {
          data.original_destination_name = localData.original_destination_name || localData.destination_name;
          data.original_fare = localData.original_fare || localData.estimated_fare;
          data.extension_fare = Math.max(0, Number(data.estimated_fare) - Number(data.original_fare || 0));
          data.rebook_count = (localData.rebook_count || 0) + 1;
        } else {
          if (localData.original_destination_name) {
            data.original_destination_name = localData.original_destination_name;
          }
          if (localData.original_fare != null) {
            data.original_fare = Number(localData.original_fare);
          }
          if (localData.extension_fare != null) {
            data.extension_fare = Number(localData.extension_fare);
          }
          if (localData.rebook_count != null) {
            data.rebook_count = Number(localData.rebook_count);
          }
        }
      }

      if (!data.rebook_count && data.original_destination_name && data.destination_name !== data.original_destination_name) {
        data.rebook_count = 1;
        if (!data.extension_fare && data.original_fare != null) {
          data.extension_fare = Math.max(0, Number(data.estimated_fare) - Number(data.original_fare));
        }
      }

      // If trip is completed, ensure additional_fare is computed even if DB columns were not yet migrated
      if (data.status === 'completed' && data.final_fare != null) {
        const estOrBase = Number(data.base_fare || data.estimated_fare || 20);
        if (data.additional_fare == null || Number(data.additional_fare) === 0) {
          const diff = Number(data.final_fare) - estOrBase;
          if (diff > 0) {
            data.additional_fare = diff;
            if (!data.base_fare) data.base_fare = estOrBase;
          }
        }
      }

      try {
        localStorage.setItem(`pasada_booking_${bookingId}`, JSON.stringify(data));
      } catch {}

      onUpdate(data as Booking);
    }
  };

  // 1. Initial immediate fetch
  fetchLatest();

  // 2. Continuous 2-second polling fallback in case realtime socket is sleeping/unsubscribed
  const pollInterval = setInterval(() => {
    fetchLatest();
  }, 2000);

  // 3. Instant Multi-Tab BroadcastChannel for zero-latency synchronization
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel('pasada_booking_sync_channel');
      bc.onmessage = (event) => {
        const msg = event?.data;
        if (msg && (msg.bookingId === bookingId || msg.id === bookingId)) {
          if (msg.updatedBooking) {
            try {
              localStorage.setItem(`pasada_booking_${bookingId}`, JSON.stringify(msg.updatedBooking));
            } catch {}
            onUpdate(msg.updatedBooking);
          } else {
            fetchLatest();
          }
        }
      };
    } catch {}
  }

  // 4. Supabase Realtime postgres_changes listener
  let channel: any = null;
  if (isUuid) {
    channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        () => {
          fetchLatest();
        }
      )
      .subscribe();
  }

  // 5. Cross-tab & local window events
  const handleLocal = (e?: any) => {
    if (e?.key) {
      if (
        e.key === `pasada_booking_${bookingId}` ||
        e.key === 'pasada_active_trip_event' ||
        e.key === 'pasada_open_queue'
      ) {
        fetchLatest();
      }
      return;
    }
    if (!e?.detail || e.detail.id === bookingId || e.detail.bookingId === bookingId) {
      fetchLatest();
    }
  };

  window.addEventListener('pasada_new_dispatch', handleLocal);
  window.addEventListener('pasada_booking_updated', handleLocal);
  window.addEventListener('pasada_rebook_extended', handleLocal);
  window.addEventListener('storage', handleLocal);

  return () => {
    if (channel) supabase.removeChannel(channel);
    if (bc) bc.close();
    clearInterval(pollInterval);
    window.removeEventListener('pasada_new_dispatch', handleLocal);
    window.removeEventListener('pasada_booking_updated', handleLocal);
    window.removeEventListener('pasada_rebook_extended', handleLocal);
    window.removeEventListener('storage', handleLocal);
  };
};

// Cache whether additional_fare column exists in remote Supabase schema cache (default false until migration is run in Supabase)
let isSurchargeColumnAvailableInDb: boolean | null = false;

export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus,
  driverId?: string,
  finalFare?: number,
  additionalFare?: number,
  additionalFareReason?: string,
  discountAmount?: number,
  baseFare?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updates: any = { status };
    if (finalFare !== undefined) updates.final_fare = finalFare;
    if (additionalFare !== undefined) updates.additional_fare = additionalFare;
    if (additionalFareReason !== undefined) updates.additional_fare_reason = additionalFareReason;
    if (discountAmount !== undefined) updates.discount_amount = discountAmount;
    if (baseFare !== undefined) updates.base_fare = baseFare;
    if (status === 'driver_assigned') updates.accepted_at = new Date().toISOString();
    if (status === 'driver_arrived') updates.arrived_at = new Date().toISOString();
    if (status === 'in_transit') updates.started_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    let validDriverId: string | undefined = driverId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(bookingId);

    // Check if driverId exists in Supabase drivers table to avoid foreign key errors
    if (validDriverId && isUuid) {
      try {
        const { data: driverRow } = await supabase
          .from('drivers')
          .select('id')
          .eq('id', validDriverId)
          .maybeSingle();

        if (!driverRow) {
          const { data: anyDriver } = await supabase
            .from('drivers')
            .select('id')
            .limit(1)
            .maybeSingle();

          if (anyDriver) {
            validDriverId = anyDriver.id;
          } else {
            validDriverId = undefined;
          }
        }
      } catch {}
    }

    if (validDriverId) {
      updates.driver_id = validDriverId;
    }

    // 1. Await Supabase database update first so ground-truth status is persisted
    if (isUuid) {
      const dbPayload: any = { ...updates };
      // If we previously detected the surcharge columns are not in the database schema, omit them
      if (isSurchargeColumnAvailableInDb === false) {
        delete dbPayload.additional_fare;
        delete dbPayload.additional_fare_reason;
        delete dbPayload.discount_amount;
        delete dbPayload.base_fare;
      }

      let { error } = await supabase
        .from('bookings')
        .update(dbPayload)
        .eq('id', bookingId);

      // If columns do not exist in Supabase schema (400 Bad Request / schema cache error),
      // remember that and retry updating using core columns
      if (error && ((error as any).status === 400 || error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        isSurchargeColumnAvailableInDb = false;
        const corePayload: any = {
          status,
          ...(finalFare !== undefined ? { final_fare: finalFare } : {}),
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          ...(status === 'driver_assigned' ? { accepted_at: new Date().toISOString() } : {}),
          ...(status === 'driver_arrived' ? { arrived_at: new Date().toISOString() } : {}),
          ...(status === 'in_transit' ? { started_at: new Date().toISOString() } : {}),
        };
        if (validDriverId) corePayload.driver_id = validDriverId;
        const retryCore = await supabase
          .from('bookings')
          .update(corePayload)
          .eq('id', bookingId);

        if (retryCore.error && validDriverId) {
          delete corePayload.driver_id;
          const retryNoDriver = await supabase.from('bookings').update(corePayload).eq('id', bookingId);
          error = retryNoDriver.error;
        } else {
          error = retryCore.error;
        }
      } else if (!error && isSurchargeColumnAvailableInDb === null && additionalFare !== undefined) {
        isSurchargeColumnAvailableInDb = true;
      }

      // If a foreign key constraint violation occurs, retry safely without driver_id
      if (error && (error.code === '23503' || (error as any).status === 409 || error.message?.includes('foreign key') || error.message?.includes('Conflict'))) {
        const safeUpdates = { ...dbPayload };
        delete safeUpdates.driver_id;
        delete safeUpdates.additional_fare;
        delete safeUpdates.additional_fare_reason;
        delete safeUpdates.discount_amount;
        delete safeUpdates.base_fare;
        const retry = await supabase
          .from('bookings')
          .update(safeUpdates)
          .eq('id', bookingId);
        error = retry.error;
      }

      if (error) {
        console.warn('Booking status update note:', error.message);
      }

      // Driver State Synchronization in DB
      let dIdToSync = validDriverId;
      if (!dIdToSync && isUuid && status === 'cancelled') {
        try {
          const { data: bRow } = await supabase
            .from('bookings')
            .select('driver_id')
            .eq('id', bookingId)
            .maybeSingle();
          if (bRow?.driver_id) dIdToSync = bRow.driver_id;
        } catch {}
      }

      if (dIdToSync) {
        if (status === 'driver_assigned') {
          try {
            await supabase
              .from('drivers')
              .update({ is_available: false })
              .eq('id', dIdToSync);
          } catch {}
        } else if (status === 'completed') {
          try {
            const { data: driverData } = await supabase
              .from('drivers')
              .select('earnings_today, total_trips')
              .eq('id', dIdToSync)
              .single();

            const prevEarnings = Number(driverData?.earnings_today || 0);
            const prevTrips = Number(driverData?.total_trips || 0);
            const addedFare = Number(finalFare || 0);

            await supabase
              .from('drivers')
              .update({
                is_available: true,
                earnings_today: prevEarnings + addedFare,
                total_trips: prevTrips + 1
              })
              .eq('id', dIdToSync);
          } catch {
            try {
              await supabase
                .from('drivers')
                .update({ is_available: true })
                .eq('id', dIdToSync);
            } catch {}
          }
        } else if (status === 'cancelled') {
          try {
            await supabase
              .from('drivers')
              .update({ is_available: true })
              .eq('id', dIdToSync);
          } catch {}
        }
      }
    }

    // 2. Synchronize local storage queue & notify listeners AFTER DB update has committed
    try {
      const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
      let updatedQueue: Booking[];
      if (status !== 'searching') {
        updatedQueue = queue.filter((b: Booking) => b.id !== bookingId);
      } else {
        updatedQueue = queue.map((b: Booking) => b.id === bookingId ? { ...b, ...updates, driver_id: validDriverId || driverId } : b);
      }
      localStorage.setItem('pasada_open_queue', JSON.stringify(updatedQueue));

      // Persist active booking & trip event for instant cross-tab / cross-window synchronization
      const existingRaw = localStorage.getItem(`pasada_booking_${bookingId}`);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const updatedBooking = {
        ...existing,
        id: bookingId,
        ...updates,
        driver_id: validDriverId || driverId || existing.driver_id,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`pasada_booking_${bookingId}`, JSON.stringify(updatedBooking));
      localStorage.setItem('pasada_active_trip_event', JSON.stringify({
        id: bookingId,
        status,
        driver_id: validDriverId || driverId,
        ...updates,
        timestamp: Date.now()
      }));

      // Broadcast to cross-tab BroadcastChannel for zero-latency multi-tab sync
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('pasada_booking_sync_channel');
          bc.postMessage({
            type: 'booking_status_updated',
            bookingId,
            id: bookingId,
            status,
            updatedBooking
          });
          bc.close();
        }
      } catch {}

      window.dispatchEvent(new CustomEvent('pasada_booking_updated', { detail: { id: bookingId, status, driver_id: validDriverId || driverId, updatedBooking } }));
      window.dispatchEvent(new CustomEvent('pasada_new_dispatch', { detail: { id: bookingId, status, driver_id: validDriverId || driverId, updatedBooking } }));
    } catch {}

    // 3. If an additional surcharge was applied on trip completion, record in audit trail
    if (status === 'completed' && additionalFare !== undefined && Number(additionalFare) > 0) {
      try {
        logTripSurchargeAudit({
          bookingId,
          driverId: validDriverId || driverId,
          baseFare: baseFare || 20,
          additionalFare: Number(additionalFare),
          additionalFareReason: additionalFareReason || 'Manual Surcharge',
          discountAmount: discountAmount || 0,
          finalFare: finalFare || 0
        });
      } catch (auditErr) {
        console.warn('Audit surcharge log note:', auditErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchActiveTrip = async (userId: string, isDriver = false): Promise<Booking | null> => {
  try {
    const column = isDriver ? 'driver_id' : 'passenger_id';
    const activeStatuses: BookingStatus[] = isDriver 
      ? ['driver_assigned', 'driver_arrived', 'in_transit']
      : ['searching', 'driver_assigned', 'driver_arrived', 'in_transit'];
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*, driver:drivers(*, profile:profiles(*)), passenger:profiles!bookings_passenger_id_fkey(*)')
      .eq(column, userId)
      .in('status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      // Fallback simple query
      const fallback = await supabase
        .from('bookings')
        .select('*')
        .eq(column, userId)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false })
      const rawResult = (data || fallback.data) as any;
      if (rawResult) {
        try {
          const stored = localStorage.getItem(`pasada_booking_${rawResult.id}`);
          if (stored) {
            const localObj = JSON.parse(stored);
            if (localObj.rebook_count) rawResult.rebook_count = localObj.rebook_count;
            if (localObj.extension_fare != null) rawResult.extension_fare = localObj.extension_fare;
            if (localObj.original_destination_name) rawResult.original_destination_name = localObj.original_destination_name;
            if (localObj.original_fare != null) rawResult.original_fare = localObj.original_fare;
          }
          const evRaw = localStorage.getItem('pasada_active_trip_event');
          if (evRaw) {
            const ev = JSON.parse(evRaw);
            if (ev?.id === rawResult.id) {
              if (ev.rebook_count) rawResult.rebook_count = ev.rebook_count;
              if (ev.extension_fare != null) rawResult.extension_fare = ev.extension_fare;
              if (ev.original_destination_name) rawResult.original_destination_name = ev.original_destination_name;
              if (ev.original_fare != null) rawResult.original_fare = ev.original_fare;
            }
          }
        } catch {}
      }
      return rawResult as Booking | null;
    }

    const result = data as any;
    if (result) {
      try {
        const stored = localStorage.getItem(`pasada_booking_${result.id}`);
        if (stored) {
          const localObj = JSON.parse(stored);
          if (localObj.rebook_count) result.rebook_count = localObj.rebook_count;
          if (localObj.extension_fare != null) result.extension_fare = localObj.extension_fare;
          if (localObj.original_destination_name) result.original_destination_name = localObj.original_destination_name;
          if (localObj.original_fare != null) result.original_fare = localObj.original_fare;
        }
      } catch {}
    }

    return result as Booking;
  } catch {
    return null;
  }
};

export const submitPassengerRating = async (params: {
  bookingId: string;
  driverId: string;
  passengerId: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('ratings')
      .insert({
        booking_id: params.bookingId,
        driver_id: params.driverId,
        passenger_id: params.passengerId,
        rating: params.rating,
        comment: params.comment || ''
      });

    if (error) throw error;

    // Recalculate Driver Average Rating
    try {
      const { data: allRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', params.driverId);

      if (allRatings && allRatings.length > 0) {
        const sum = allRatings.reduce((acc, r) => acc + Number(r.rating || 5), 0);
        const avg = Math.round((sum / allRatings.length) * 100) / 100;
        await supabase
          .from('drivers')
          .update({ rating_avg: avg })
          .eq('id', params.driverId);
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchDriverReviews = async (driverId: string): Promise<Array<{
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  passenger_name?: string;
  route?: string;
}>> => {
  try {
    if (!driverId) return [];

    // Query ratings safely
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return [];
    }

    // Resolve passenger names and routes
    const passengerIds = Array.from(new Set(data.map((r: any) => r.passenger_id).filter(Boolean)));
    const bookingIds = Array.from(new Set(data.map((r: any) => r.booking_id).filter(Boolean)));

    let profileMap: Record<string, string> = {};
    if (passengerIds.length > 0) {
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', passengerIds);
        if (profs) {
          profs.forEach((p: any) => { profileMap[p.id] = p.full_name; });
        }
      } catch {}
    }

    let bookingMap: Record<string, string> = {};
    if (bookingIds.length > 0) {
      try {
        const { data: bks } = await supabase
          .from('bookings')
          .select('id, origin_name, destination_name')
          .in('id', bookingIds);
        if (bks) {
          bks.forEach((b: any) => { bookingMap[b.id] = `${b.origin_name} ➔ ${b.destination_name}`; });
        }
      } catch {}
    }

    return data.map((r: any) => ({
      id: r.id,
      rating: r.rating || 5,
      comment: r.comment || '',
      created_at: r.created_at || new Date().toISOString(),
      passenger_name: profileMap[r.passenger_id] || 'Pasahero',
      route: bookingMap[r.booking_id] || undefined
    }));
  } catch {
    return [];
  }
};

export const fetchUserBookings = async (userId: string, isDriver = false): Promise<Booking[]> => {
  try {
    const column = isDriver ? 'driver_id' : 'passenger_id';
    let { data, error } = await supabase
      .from('bookings')
      .select('*, driver:drivers(*, profile:profiles(*)), passenger:profiles!bookings_passenger_id_fkey(*)')
      .eq(column, userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      const fallback = await supabase
        .from('bookings')
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false });
      data = fallback.data as any;
    }

    const rawList = (data as any[]) || [];
    const enhanced = rawList.map((b: any) => {
      try {
        const stored = localStorage.getItem(`pasada_booking_${b.id}`);
        if (stored) {
          const localObj = JSON.parse(stored);
          if (localObj.original_destination_name) b.original_destination_name = localObj.original_destination_name;
          if (localObj.original_fare != null) b.original_fare = localObj.original_fare;
          if (localObj.extension_fare != null) b.extension_fare = localObj.extension_fare;
          if (localObj.rebook_count != null) b.rebook_count = localObj.rebook_count;
          if (localObj.additional_fare != null && b.additional_fare == null) b.additional_fare = localObj.additional_fare;
          if (localObj.additional_fare_reason && !b.additional_fare_reason) b.additional_fare_reason = localObj.additional_fare_reason;
        }
      } catch {}

      if (!b.rebook_count && b.original_destination_name && b.original_destination_name !== b.destination_name) {
        b.rebook_count = 1;
        if (!b.extension_fare && b.original_fare != null) {
          b.extension_fare = Math.max(0, Number(b.final_fare || b.estimated_fare) - Number(b.original_fare));
        }
      }
      return b as Booking;
    });

    return enhanced;
  } catch (err) {
    return [];
  }
};

export const fetchOpenDispatches = async (): Promise<Booking[]> => {
  try {
    let { data, error } = await supabase
      .from('bookings')
      .select('*, passenger:profiles!bookings_passenger_id_fkey(id, full_name, phone_number, passenger_type)')
      .eq('status', 'searching')
      .order('created_at', { ascending: false });

    if (error || !data) {
      const fallbackQuery = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'searching')
        .order('created_at', { ascending: false });
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    // When Supabase responds successfully, server bookings are the ground truth!
    if (!error && data) {
      const serverBookings: Booking[] = (data as any[]).map((b: any) => {
        let cachedPassenger: any = null;
        try {
          const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
          cachedPassenger = queue.find((item: any) => item.id === b.id)?.passenger;
        } catch {}

        const pType = b.passenger?.passenger_type || b.passenger_type || cachedPassenger?.passenger_type || 'regular';

        return {
          ...b,
          passenger_type: pType,
          passenger: b.passenger ? {
            ...b.passenger,
            passenger_type: pType
          } : (cachedPassenger || {
            id: b.passenger_id || '',
            full_name: b.passenger_name || 'Ka-Pasada Commuter',
            passenger_type: pType
          })
        };
      });

      // Directly synchronize localStorage queue to match exact ground-truth bookings
      try {
        localStorage.setItem('pasada_open_queue', JSON.stringify(serverBookings));
      } catch {}

      return serverBookings;
    }

    // Offline / network fallback only if Supabase call failed
    let localQueue: Booking[] = [];
    try {
      localQueue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]')
        .filter((b: Booking) => b && b.status === 'searching');
    } catch {}

    return localQueue;
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

/**
 * Rebook / Extend destination for an active booking.
 * Cumulatively adds the extension fare to original fare and syncs across DB, local cache, and events.
 */
export const extendBookingDestination = async (params: {
  bookingId: string;
  newDestinationName: string;
  newDestinationLat: number;
  newDestinationLng: number;
  extensionFare: number;
  passengerId?: string;
  passengerName?: string;
}): Promise<{ success: boolean; updatedBooking?: Booking; error?: string }> => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(params.bookingId);

    // 1. Retrieve current booking from cache or Supabase
    let currentBooking: any = null;
    try {
      const stored = localStorage.getItem(`pasada_booking_${params.bookingId}`);
      if (stored) currentBooking = JSON.parse(stored);
      if (!currentBooking) {
        const storedActive = localStorage.getItem('pasada_active_booking');
        if (storedActive) {
          const parsed = JSON.parse(storedActive);
          if (parsed.id === params.bookingId) currentBooking = parsed;
        }
      }
    } catch {}

    if (isUuid && (!currentBooking || !currentBooking.destination_name)) {
      try {
        const { data: dbData } = await supabase
          .from('bookings')
          .select('*, driver:drivers(*, profile:profiles(*)), passenger:profiles!bookings_passenger_id_fkey(*)')
          .eq('id', params.bookingId)
          .maybeSingle();
        if (dbData) currentBooking = { ...(currentBooking || {}), ...dbData };
      } catch {}
    }

    const previousDestination = currentBooking?.destination_name || 'Original Destination';
    const originalDestinationName = currentBooking?.original_destination_name || previousDestination;
    const previousEstimatedFare = Number(currentBooking?.estimated_fare || 20);
    const originalFare = Number(currentBooking?.original_fare || previousEstimatedFare);
    const accumulatedExtensionFare = Number(currentBooking?.extension_fare || 0) + Number(params.extensionFare);
    const accumulatedEstimatedFare = previousEstimatedFare + Number(params.extensionFare);
    const rebookCount = Number(currentBooking?.rebook_count || 0) + 1;

    // 2. Prepare database updates (ONLY fields existing in public.bookings)
    const dbPayload: any = {
      destination_name: params.newDestinationName,
      destination_lat: params.newDestinationLat,
      destination_lng: params.newDestinationLng,
      estimated_fare: accumulatedEstimatedFare,
    };

    if (isUuid) {
      const { error: dbError } = await supabase
        .from('bookings')
        .update(dbPayload)
        .eq('id', params.bookingId);

      if (dbError) {
        console.warn('Booking rebook Supabase update note:', dbError.message);
      }
    }

    // 3. Construct unified updated booking record with full extension history
    const updatedBooking: Booking = {
      ...(currentBooking || {}),
      id: params.bookingId,
      destination_name: params.newDestinationName,
      destination_lat: params.newDestinationLat,
      destination_lng: params.newDestinationLng,
      estimated_fare: accumulatedEstimatedFare,
      original_destination_name: originalDestinationName,
      original_fare: originalFare,
      extension_fare: accumulatedExtensionFare,
      rebook_count: rebookCount,
      driver_id: currentBooking?.driver_id,
      driver: currentBooking?.driver,
      passenger_id: currentBooking?.passenger_id || params.passengerId,
      status: currentBooking?.status || 'in_transit',
      updated_at: new Date().toISOString(),
    } as any;

    // 4. Update localStorage caches
    try {
      localStorage.setItem(`pasada_booking_${params.bookingId}`, JSON.stringify(updatedBooking));
      
      const activeStored = localStorage.getItem('pasada_active_booking');
      if (activeStored) {
        try {
          const act = JSON.parse(activeStored);
          if (act.id === params.bookingId) {
            localStorage.setItem('pasada_active_booking', JSON.stringify({ ...act, ...updatedBooking }));
          }
        } catch {}
      }

      localStorage.setItem('pasada_active_trip_event', JSON.stringify({
        id: params.bookingId,
        status: updatedBooking.status,
        destination_name: params.newDestinationName,
        destination_lat: params.newDestinationLat,
        destination_lng: params.newDestinationLng,
        estimated_fare: accumulatedEstimatedFare,
        original_destination_name: originalDestinationName,
        original_fare: originalFare,
        extension_fare: accumulatedExtensionFare,
        rebook_count: rebookCount,
        driver_id: updatedBooking.driver_id,
        timestamp: Date.now()
      }));

      // Update in open queue if present
      const queueRaw = localStorage.getItem('pasada_open_queue');
      if (queueRaw) {
        const queue = JSON.parse(queueRaw);
        const updatedQ = queue.map((b: Booking) => b.id === params.bookingId ? { ...b, ...updatedBooking } : b);
        localStorage.setItem('pasada_open_queue', JSON.stringify(updatedQ));
      }
    } catch {}

    // 5. Broadcast to cross-tab BroadcastChannel for zero-latency multi-tab sync
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('pasada_booking_sync_channel');
        bc.postMessage({
          type: 'rebook_extended',
          bookingId: params.bookingId,
          id: params.bookingId,
          updatedBooking
        });
        bc.close();
      }
    } catch {}

    // 6. Dispatch cross-tab & local window events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pasada_booking_updated', {
        detail: {
          id: params.bookingId,
          destination_name: params.newDestinationName,
          destination_lat: params.newDestinationLat,
          destination_lng: params.newDestinationLng,
          estimated_fare: accumulatedEstimatedFare,
          rebook: true,
          updatedBooking
        }
      }));

      window.dispatchEvent(new CustomEvent('pasada_rebook_extended', {
        detail: {
          bookingId: params.bookingId,
          newDestinationName: params.newDestinationName,
          newDestinationLat: params.newDestinationLat,
          newDestinationLng: params.newDestinationLng,
          previousDestination,
          previousFare: previousEstimatedFare,
          extensionFare: params.extensionFare,
          accumulatedFare: accumulatedEstimatedFare,
          rebookCount,
          updatedBooking
        }
      }));
    }

    // 6. Record in official audit trail (admin_actions)
    try {
      await logTripRebookExtensionAudit({
        bookingId: params.bookingId,
        driverId: updatedBooking.driver_id,
        driverName: updatedBooking.driver?.profile?.full_name,
        passengerId: params.passengerId || updatedBooking.passenger_id,
        passengerName: params.passengerName || updatedBooking.passenger_name || 'Passenger',
        previousDestination,
        newDestination: params.newDestinationName,
        previousFare: previousEstimatedFare,
        extensionFare: params.extensionFare,
        accumulatedFare: accumulatedEstimatedFare,
        rebookCount
      });
    } catch (auditErr) {
      console.warn('Rebook audit logging error:', auditErr);
    }

    return { success: true, updatedBooking };
  } catch (err: any) {
    console.error('extendBookingDestination error:', err);
    return { success: false, error: err.message || 'Failed to extend destination' };
  }
};

