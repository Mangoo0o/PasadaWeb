import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { ChatMessage, subscribeToTripChat } from '../../services/tripChatService';
import { soundService } from '../../services/soundNotificationService';

interface InPhoneMessageBannerProps {
  bookingId?: string;
  currentUserId: string;
  currentUserRole?: 'passenger' | 'driver';
  isChatOpen: boolean;
  onOpenChat: () => void;
}

export const InPhoneMessageBanner: React.FC<InPhoneMessageBannerProps> = ({
  bookingId,
  currentUserId,
  currentUserRole,
  isChatOpen,
  onOpenChat
}) => {
  const [activeBanner, setActiveBanner] = useState<ChatMessage | null>(null);

  useEffect(() => {
    // Request device notification permission on mount if supported
    soundService.requestPermission();
  }, []);

  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = subscribeToTripChat(bookingId, (newMsg) => {
      // Only show banner if message was sent by the OTHER person
      const isFromOther = currentUserRole
        ? newMsg.senderRole !== currentUserRole
        : newMsg.senderId !== currentUserId;

      if (isFromOther) {
        // Play device notification & sound
        soundService.playMessagePop(newMsg.senderName, newMsg.text);

        // If chat modal is NOT open, pop the heads-up notification banner
        if (!isChatOpen) {
          setActiveBanner(newMsg);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, currentUserId, currentUserRole, isChatOpen]);

  // Auto-dismiss banner after 5.5 seconds
  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      setActiveBanner(null);
    }, 5500);

    return () => clearTimeout(timer);
  }, [activeBanner]);

  // If chat is opened, dismiss active banner immediately
  useEffect(() => {
    if (isChatOpen) {
      setActiveBanner(null);
    }
  }, [isChatOpen]);

  if (!activeBanner || isChatOpen) return null;

  return createPortal(
    <div 
      className="fixed top-2 sm:top-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[100001] pointer-events-auto animate-in slide-in-from-top-6 fade-in duration-300 select-none"
      onClick={() => {
        onOpenChat();
        setActiveBanner(null);
      }}
    >
      <div className="bg-slate-950/95 dark:bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-white/15 flex items-center gap-3 cursor-pointer hover:bg-slate-900 transition-all active:scale-98">
        {/* App Icon / Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052d1] to-sky-400 text-white flex items-center justify-center shrink-0 shadow-md">
          <MessageSquare className="w-5 h-5 text-[#fcd400] animate-bounce" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-black text-xs text-white truncate">
              {activeBanner.senderName || 'PasadaGuide Chat'}
            </span>
            <span className="text-[10px] text-sky-200 shrink-0 font-medium">
              ngayon
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-2 mt-0.5 leading-tight font-normal">
            {activeBanner.text}
          </p>
          <span className="text-[9px] text-[#fcd400] font-bold block mt-0.5">
            I-tap para mag-reply 💬
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBanner(null);
          }}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>,
    document.body
  );
};
