import { supabase } from '../api/supabaseClient';

export interface DriverCoordinates {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

// In-memory state to throttle updates to 3-4 seconds
let lastBroadcastTime = 0;
const BROADCAST_INTERVAL_MS = 3500; // 3.5 seconds

/**
 * Broadcasts driver location with a 3.5s throttle to balance battery life & real-time responsiveness.
 * Updates Supabase drivers table and broadcasts over Supabase Realtime channel.
 */
export const broadcastDriverLocation = async (
  driverId: string,
  coords: DriverCoordinates
): Promise<void> => {
  if (!driverId || !coords.lat || !coords.lng) return;

  const now = Date.now();
  if (now - lastBroadcastTime < BROADCAST_INTERVAL_MS) {
    return; // Throttled
  }
  lastBroadcastTime = now;

  const payload = {
    driverId,
    lat: coords.lat,
    lng: coords.lng,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    timestamp: now
  };

  // 1. Same-window / multi-tab event for instant local preview
  try {
    window.dispatchEvent(new CustomEvent('pasada_driver_location', { detail: payload }));
    localStorage.setItem(`pasada_driver_pos_${driverId}`, JSON.stringify(payload));
  } catch {}

  // 2. Broadcast via Supabase Realtime Channel
  try {
    const channel = supabase.channel(`driver-tracking-${driverId}`);
    channel.send({
      type: 'broadcast',
      event: 'location_update',
      payload
    });
  } catch (err) {
    console.warn('Realtime driver broadcast error:', err);
  }

  // 3. Persist to drivers table in Supabase (async, non-blocking)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(driverId)) {
    (async () => {
      try {
        await supabase
          .from('drivers')
          .update({
            current_lat: coords.lat,
            current_lng: coords.lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', driverId);
      } catch {}
    })();
  }
};

/**
 * Subscribes passenger / admin client to live GPS updates of a specific driver.
 * Uses both Supabase Realtime broadcast and local storage / window event fallback.
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
      if (parsed?.lat && parsed?.lng) {
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
        if (event?.payload && event.payload.lat && event.payload.lng) {
          onLocationUpdate(event.payload);
        }
      }
    )
    .subscribe();

  // 2. Local window event listener for testing on same machine / tabs
  const handleLocalEvent = (e: any) => {
    const detail = e?.detail;
    if (detail && detail.driverId === driverId && detail.lat && detail.lng) {
      onLocationUpdate(detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === `pasada_driver_pos_${driverId}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.lat && parsed?.lng) {
          onLocationUpdate(parsed);
        }
      } catch {}
    }
  };

  window.addEventListener('pasada_driver_location', handleLocalEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('pasada_driver_location', handleLocalEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};
