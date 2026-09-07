import { supabase } from '../api/supabaseClient';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'passenger' | 'driver';
  senderName: string;
  text: string;
  timestamp: string;
}

export const getStoredTripMessages = (bookingId: string): ChatMessage[] => {
  if (!bookingId) return [];
  try {
    const raw = localStorage.getItem(`pasada_chat_${bookingId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const fetchTripMessages = async (bookingId: string): Promise<ChatMessage[]> => {
  if (!bookingId) return [];

  try {
    const { data, error } = await supabase
      .from('trip_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return getStoredTripMessages(bookingId);
    }

    const dbMessages: ChatMessage[] = data.map((row: any) => ({
      id: row.id,
      bookingId: row.booking_id,
      senderId: row.sender_id,
      senderRole: row.sender_role as 'passenger' | 'driver',
      senderName: row.sender_name,
      text: row.text,
      timestamp: row.created_at
    }));

    // Merge with any locally stored messages
    const local = getStoredTripMessages(bookingId);
    const idMap = new Map<string, ChatMessage>();
    dbMessages.forEach((m) => idMap.set(m.id, m));
    local.forEach((m) => {
      if (!idMap.has(m.id)) {
        idMap.set(m.id, m);
      }
    });

    const merged = Array.from(idMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Sync to localStorage
    try {
      localStorage.setItem(`pasada_chat_${bookingId}`, JSON.stringify(merged.slice(-100)));
    } catch {}

    // Seed seen IDs in active subscription
    const sub = subscriptionMap.get(bookingId);
    if (sub) {
      merged.forEach((m) => sub.seenIds.add(m.id));
    }

    return merged;
  } catch {
    return getStoredTripMessages(bookingId);
  }
};

interface BookingChatSubscription {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<(msg: ChatMessage) => void>;
  seenIds: Set<string>;
  broadcastChannel?: BroadcastChannel | null;
  cleanupLocal?: () => void;
  teardownTimer?: any;
}

const subscriptionMap = new Map<string, BookingChatSubscription>();

export const sendTripMessage = async (
  bookingId: string,
  params: {
    senderId: string;
    senderRole: 'passenger' | 'driver';
    senderName: string;
    text: string;
  }
): Promise<ChatMessage> => {
  const fullMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    bookingId,
    senderId: params.senderId,
    senderRole: params.senderRole,
    senderName: params.senderName,
    text: params.text.trim(),
    timestamp: new Date().toISOString()
  };

  // 1. Register ID as seen in active subscription to prevent echo
  const sub = subscriptionMap.get(bookingId);
  if (sub) {
    sub.seenIds.add(fullMessage.id);
  }

  // 2. Cache in localStorage
  try {
    const existing = getStoredTripMessages(bookingId);
    const updated = [...existing.filter((m) => m.id !== fullMessage.id), fullMessage];
    localStorage.setItem(`pasada_chat_${bookingId}`, JSON.stringify(updated.slice(-100)));
  } catch {}

  // 3. Local BroadcastChannel & CustomEvent for immediate multi-tab testing
  try {
    window.dispatchEvent(new CustomEvent('pasada_chat_msg', { detail: fullMessage }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`pasada_chat_bc_${bookingId}`);
      bc.postMessage(fullMessage);
      bc.close();
    }
  } catch {}

  // 4. Save message directly into Supabase trip_messages table
  try {
    const { data, error } = await supabase
      .from('trip_messages')
      .insert({
        id: fullMessage.id,
        booking_id: bookingId,
        sender_id: params.senderId,
        sender_role: params.senderRole,
        sender_name: params.senderName,
        text: fullMessage.text,
        created_at: fullMessage.timestamp
      })
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase trip_messages insert warning:', error.message);
    } else if (data) {
      // Row is now persisted in database
    }
  } catch (dbErr) {
    console.warn('Supabase trip_messages insert error:', dbErr);
  }

  // 5. Also broadcast over Supabase Realtime Channel if available
  try {
    if (sub?.channel) {
      sub.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: fullMessage
      });
    }
  } catch {}

  return fullMessage;
};

export const subscribeToTripChat = (
  bookingId: string,
  onMessageReceived: (message: ChatMessage) => void
): (() => void) => {
  if (!bookingId) return () => {};

  // If a subscription already exists for this bookingId, reuse it and add the listener
  if (subscriptionMap.has(bookingId)) {
    const existing = subscriptionMap.get(bookingId)!;
    if (existing.teardownTimer) {
      clearTimeout(existing.teardownTimer);
      existing.teardownTimer = null;
    }
    existing.listeners.add(onMessageReceived);

    return () => {
      existing.listeners.delete(onMessageReceived);
      if (existing.listeners.size === 0) {
        if (existing.teardownTimer) clearTimeout(existing.teardownTimer);
        existing.teardownTimer = setTimeout(() => {
          if (existing.listeners.size === 0) {
            if (existing.cleanupLocal) existing.cleanupLocal();
            supabase.removeChannel(existing.channel);
            subscriptionMap.delete(bookingId);
          }
        }, 2000);
      }
    };
  }

  // Create new subscription
  const listeners = new Set<(msg: ChatMessage) => void>();
  listeners.add(onMessageReceived);

  const initialStored = getStoredTripMessages(bookingId);
  const seenIds = new Set<string>(initialStored.map((m) => m.id));

  const dispatchMessage = (msg: ChatMessage) => {
    if (!msg || !msg.id || msg.bookingId !== bookingId) return;
    if (seenIds.has(msg.id)) return;
    seenIds.add(msg.id);

    // Save to localStorage
    try {
      const current = getStoredTripMessages(bookingId);
      if (!current.some((m) => m.id === msg.id)) {
        const updated = [...current, msg].slice(-100);
        localStorage.setItem(`pasada_chat_${bookingId}`, JSON.stringify(updated));
      }
    } catch {}

    // Dispatch to all subscribers
    listeners.forEach((fn) => {
      try {
        fn(msg);
      } catch (err) {
        console.error('Chat listener dispatch error:', err);
      }
    });
  };

  // Set up Supabase Realtime Channel
  const channelName = `trip-chat-room-${bookingId}`;
  const channel = supabase
    .channel(channelName)
    // 1. Realtime database changes
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_messages',
        filter: `booking_id=eq.${bookingId}`
      },
      (payload) => {
        const row = payload.new as any;
        if (row && row.booking_id === bookingId) {
          dispatchMessage({
            id: row.id,
            bookingId: row.booking_id,
            senderId: row.sender_id,
            senderRole: row.sender_role as 'passenger' | 'driver',
            senderName: row.sender_name,
            text: row.text,
            timestamp: row.created_at || new Date().toISOString()
          });
        }
      }
    )
    // 2. Realtime broadcast fallback
    .on(
      'broadcast' as any,
      { event: 'chat_message' },
      (event: { payload?: ChatMessage }) => {
        if (event?.payload && event.payload.bookingId === bookingId) {
          dispatchMessage(event.payload);
        }
      }
    )
    .subscribe();

  // 3. Local BroadcastChannel & CustomEvent for multi-tab
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(`pasada_chat_bc_${bookingId}`);
      bc.onmessage = (event) => {
        if (event.data) dispatchMessage(event.data);
      };
    } catch {}
  }

  const handleLocalMsg = (e: any) => {
    const msg = e?.detail as ChatMessage;
    if (msg && msg.bookingId === bookingId) {
      dispatchMessage(msg);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === `pasada_chat_${bookingId}` && e.newValue) {
      try {
        const list: ChatMessage[] = JSON.parse(e.newValue);
        const last = list[list.length - 1];
        if (last && last.bookingId === bookingId) {
          dispatchMessage(last);
        }
      } catch {}
    }
  };

  window.addEventListener('pasada_chat_msg', handleLocalMsg);
  window.addEventListener('storage', handleStorage);

  const newSub: BookingChatSubscription = {
    channel,
    listeners,
    seenIds,
    broadcastChannel: bc,
    cleanupLocal: () => {
      window.removeEventListener('pasada_chat_msg', handleLocalMsg);
      window.removeEventListener('storage', handleStorage);
      if (bc) {
        bc.close();
      }
    }
  };

  subscriptionMap.set(bookingId, newSub);

  return () => {
    newSub.listeners.delete(onMessageReceived);
    if (newSub.listeners.size === 0) {
      if (newSub.teardownTimer) clearTimeout(newSub.teardownTimer);
      newSub.teardownTimer = setTimeout(() => {
        if (newSub.listeners.size === 0) {
          if (newSub.cleanupLocal) newSub.cleanupLocal();
          supabase.removeChannel(newSub.channel);
          subscriptionMap.delete(bookingId);
        }
      }, 2000);
    }
  };
};
