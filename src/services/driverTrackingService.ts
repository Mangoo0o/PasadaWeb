import { supabase } from '../api/supabaseClient';

export interface DriverCoordinates {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

// In-memory state to throttle updates to ~2 seconds
let lastBroadcastTime = 0;
const BROADCAST_INTERVAL_MS = 2000; // 2 seconds for responsive real-time motion

interface DriverBroadcastSession {
  channel: ReturnType<typeof supabase.channel>;
  isSubscribed: boolean;
  queuedPayload?: any;
}

const activeBroadcastSessions = new Map<string, DriverBroadcastSession>();

/**
 * Retrieves or establishes a persistent, SUBSCRIBED Supabase Realtime channel for broadcasting.
 * This fixes the issue where channel.send() was previously called on unsubscribed channels.
 */
export const getOrCreateBroadcastSession = (driverId: string): DriverBroadcastSession => {
  let session = activeBroadcastSessions.get(driverId);
  if (!session) {
    const channel = supabase.channel(`driver-tracking-${driverId}`);
    session = {
      channel,
      isSubscribed: false,
    };

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && session) {
        session.isSubscribed = true;
        if (session.queuedPayload) {
          session.channel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: session.queuedPayload,
          });
          session.queuedPayload = undefined;
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        if (session) session.isSubscribed = false;
      }
    });

    activeBroadcastSessions.set(driverId, session);
  }
  return session;
};

/**
 * Tears down a driver's active broadcast session.
 */
export const stopDriverBroadcastSession = (driverId: string) => {
  const session = activeBroadcastSessions.get(driverId);
  if (session) {
    try {
      supabase.removeChannel(session.channel);
    } catch {}
    activeBroadcastSessions.delete(driverId);
  }
};

/**
 * Broadcasts driver location with a 2s throttle to balance battery life & real-time responsiveness.
 * Updates Supabase drivers table and broadcasts over Supabase Realtime channel and local channels.
 */
export const broadcastDriverLocation = async (
  driverId: string,
  coords: DriverCoordinates,
  forceImmediate = false
): Promise<void> => {
  if (!driverId || coords.lat == null || coords.lng == null) return;

  const now = Date.now();
  if (!forceImmediate && now - lastBroadcastTime < BROADCAST_INTERVAL_MS) {
    return; // Throttled
  }
  lastBroadcastTime = now;

  const payload = {
    driverId,
    lat: coords.lat,
    lng: coords.lng,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    timestamp: now,
  };

  // 1. Same-window CustomEvent for immediate in-tab listeners
  try {
    window.dispatchEvent(new CustomEvent('pasada_driver_location', { detail: payload }));
    localStorage.setItem(`pasada_driver_pos_${driverId}`, JSON.stringify(payload));
  } catch {}

  // 2. Cross-tab BroadcastChannel for zero-latency multi-tab testing
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`pasada_driver_tracking_bc_${driverId}`);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {}

  // 3. Broadcast via Persistent Supabase Realtime Channel
  try {
    const session = getOrCreateBroadcastSession(driverId);
    if (session.isSubscribed) {
      session.channel.send({
        type: 'broadcast',
        event: 'location_update',
        payload,
      });
    } else {
      // Queue latest position to be sent as soon as subscription finishes
      session.queuedPayload = payload;
    }
  } catch (err) {
    console.warn('Realtime driver broadcast error:', err);
  }

  // 4. Persist to drivers table in Supabase (async, non-blocking)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(driverId)) {
    (async () => {
      try {
        await supabase
          .from('drivers')
          .update({
            current_lat: coords.lat,
            current_lng: coords.lng,
            updated_at: new Date().toISOString(),
          })
          .eq('id', driverId);
      } catch {}
    })();
  }
};

/**
 * Subscribes passenger / admin client to live GPS updates of a specific driver.
 * Uses Supabase Realtime broadcast, BroadcastChannel, and local storage / window event fallback.
 */
export const subscribeToDriverLocation = (
  driverId: string,
  onLocationUpdate: (coords: DriverCoordinates) => void
): (() => void) => {
  if (!driverId) return () => {};

  // Check initial cached coordinate if available
  try {
    const cached = localStorage.getItem(`pasada_driver_pos_${driverId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.lat != null && parsed?.lng != null) {
        onLocationUpdate(parsed);
      }
    }
  } catch {}

  // 1. Listen on Supabase Realtime Broadcast Channel
  const channel = supabase
    .channel(`driver-tracking-${driverId}`)
    .on(
      'broadcast' as any,
      { event: 'location_update' },
      (event: { payload?: DriverCoordinates & { driverId?: string } }) => {
        if (event?.payload && event.payload.lat != null && event.payload.lng != null) {
          onLocationUpdate(event.payload);
        }
      }
    )
    .subscribe();

  // 2. Cross-tab BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(`pasada_driver_tracking_bc_${driverId}`);
      bc.onmessage = (event) => {
        if (event.data?.lat != null && event.data?.lng != null) {
          onLocationUpdate(event.data);
        }
      };
    }
  } catch {}

  // 3. Local window event listener for testing on same machine / tabs
  const handleLocalEvent = (e: any) => {
    const detail = e?.detail;
    if (detail && detail.driverId === driverId && detail.lat != null && detail.lng != null) {
      onLocationUpdate(detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === `pasada_driver_pos_${driverId}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.lat != null && parsed?.lng != null) {
          onLocationUpdate(parsed);
        }
      } catch {}
    }
  };

  window.addEventListener('pasada_driver_location', handleLocalEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    supabase.removeChannel(channel);
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    window.removeEventListener('pasada_driver_location', handleLocalEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};
