import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Sparkles } from 'lucide-react';
import { ChatMessage, sendTripMessage, subscribeToTripChat, getStoredTripMessages } from '../../services/tripChatService';
import { soundService } from '../../services/soundNotificationService';

interface InTripChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  currentUserId: string;
  currentUserRole: 'passenger' | 'driver';
  currentUserName: string;
  otherPartyName: string;
  otherPartySubtitle?: string;
}

const PASSENGER_PRESETS = [
  'Nandito na po ako sa labas 🙋‍♂️',
  'Nasa tapat po ako ng landmark 📍',
  'Pakibilisan po konti kung pwede ⏱️',
  'Salamat po! 🙏'
];

const DRIVER_PRESETS = [
  'Papunta na po 🛵',
  'Nandito na po sa pickup location 📍',
  'Medyo ma-traffic po ⏳',
  'Sandali lang po ⏱️'
];

export const InTripChatModal: React.FC<InTripChatModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  currentUserId,
  currentUserRole,
  currentUserName,
  otherPartyName,
  otherPartySubtitle
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getStoredTripMessages(bookingId));
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setMessages(getStoredTripMessages(bookingId));
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = subscribeToTripChat(bookingId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Play chime if message came from the other person
      if (newMsg.senderId !== currentUserId) {
        soundService.playMessagePop(newMsg.senderName, newMsg.text);
      }

      setTimeout(scrollToBottom, 50);
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, currentUserId]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const sent = await sendTripMessage(bookingId, {
        senderId: currentUserId,
        senderRole: currentUserRole,
        senderName: currentUserName || (currentUserRole === 'driver' ? 'Drayber' : 'Pasahero'),
        text
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setInputText('');
      setTimeout(scrollToBottom, 50);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const presets = currentUserRole === 'passenger' ? PASSENGER_PRESETS : DRIVER_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[80vh] sm:h-[600px] border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#0052d1] to-[#003f9e] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[#fcd400] font-bold text-sm border border-white/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                {otherPartyName || (currentUserRole === 'passenger' ? 'Tricycle Driver' : 'Pasahero')}
              </h3>
              <p className="text-[11px] text-sky-100 font-medium">
                {otherPartySubtitle || 'Live In-Trip Chat'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-950/60 text-[#0052d1] dark:text-sky-400 flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Walang mensahe pa
              </p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
                Mag-click ng mabilis na mensahe sa ibaba o mag-type para makipag-ugnayan.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-medium shadow-xs ${
                      isMine
                        ? 'bg-[#0052d1] text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 px-1 mt-0.5">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Presets Bar */}
        <div className="px-3 pt-2 pb-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900 text-[#0052d1] dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-transform active:scale-95 cursor-pointer font-medium"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Free-Text Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mag-type ng mensahe dito..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052d1]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 bg-[#0052d1] hover:bg-[#003f9e] disabled:opacity-40 text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
