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

  // 1. Store in localStorage
  try {
    const existing = getStoredTripMessages(bookingId);
    const updated = [...existing, fullMessage];
    localStorage.setItem(`pasada_chat_${bookingId}`, JSON.stringify(updated.slice(-50)));
  } catch {}

  // 2. Dispatch local window event for multi-tab testing
  try {
    window.dispatchEvent(new CustomEvent('pasada_chat_msg', { detail: fullMessage }));
  } catch {}

  // 3. Broadcast over Supabase Realtime Channel
  try {
    const channel = supabase.channel(`trip-chat-${bookingId}`);
    channel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: fullMessage
    });
  } catch (err) {
    console.warn('Realtime chat broadcast error:', err);
  }

  return fullMessage;
};

export const subscribeToTripChat = (
  bookingId: string,
  onMessageReceived: (message: ChatMessage) => void
): (() => void) => {
  if (!bookingId) return () => {};

  const channel = supabase
    .channel(`trip-chat-${bookingId}`)
    .on(
      'broadcast' as any,
      { event: 'chat_message' },
      (event: { payload?: ChatMessage }) => {
        if (event?.payload && event.payload.bookingId === bookingId) {
          onMessageReceived(event.payload);
        }
      }
    )
    .subscribe();

  const handleLocalMsg = (e: any) => {
    const msg = e?.detail as ChatMessage;
    if (msg && msg.bookingId === bookingId) {
      onMessageReceived(msg);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === `pasada_chat_${bookingId}` && e.newValue) {
      try {
        const list: ChatMessage[] = JSON.parse(e.newValue);
        const last = list[list.length - 1];
        if (last && last.bookingId === bookingId) {
          onMessageReceived(last);
        }
      } catch {}
    }
  };

  window.addEventListener('pasada_chat_msg', handleLocalMsg);
  window.addEventListener('storage', handleStorage);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('pasada_chat_msg', handleLocalMsg);
    window.removeEventListener('storage', handleStorage);
  };
};
