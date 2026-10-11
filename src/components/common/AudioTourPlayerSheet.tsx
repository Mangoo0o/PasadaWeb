import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, Play, Pause, X, Bike, AlertCircle, Sparkles } from 'lucide-react';
import { useTouristAudio } from '../../services/touristAudioService';
import { TouristSpot } from '../../types/database.types';

interface AudioTourPlayerSheetProps {
  onBookSpot?: (spot: TouristSpot) => void;
  className?: string;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AudioTourPlayerSheet: React.FC<AudioTourPlayerSheetProps> = ({
  onBookSpot,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const {
    activeSpot,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    playbackType,
    error,
    pause,
    resume,
    stop,
    seek,
  } = useTouristAudio();

  if (!activeSpot) return null;

  const isFil = i18n.language === 'fil' || i18n.language === 'tl';
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={`fixed bottom-20 sm:bottom-6 left-3 right-3 max-w-md mx-auto z-50 bg-[#0052d1] text-white p-3 rounded-2xl shadow-2xl border border-white/20 animate-in slide-from-bottom-5 duration-200 ${className}`}
    >
      {/* Top Details Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/10 relative">
            <Volume2 className="w-4 h-4 text-[#fcd400]" />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            )}
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-200">
                {isFil ? 'Gabay sa Pasyalan' : 'Audio Tour Guide'}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-medium flex items-center gap-0.5">
                {playbackType === 'audio' ? '🎵 MP3' : '🎙️ Voice Guide'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-white truncate drop-shadow-xs">
              {activeSpot.name}
            </p>
          </div>
        </div>

        {/* Action Buttons: Book and Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onBookSpot && (
            <button
              onClick={() => onBookSpot(activeSpot)}
              className="px-3 py-1.5 rounded-full bg-[#fcd400] text-[#131b2e] font-black text-xs hover:bg-amber-300 transition-transform active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
            >
              <Bike className="w-3.5 h-3.5 text-[#0052d1]" />
              <span>{isFil ? 'Sakay' : 'Book'}</span>
            </button>
          )}

          <button
            onClick={() => stop()}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer text-xs"
            title="Stop & Close Audio Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress & Control Bar */}
      <div className="bg-black/25 rounded-xl p-2 flex items-center gap-2.5 border border-white/10">
        {/* Play/Pause Button */}
        <button
          onClick={() => {
            if (isPaused) {
              resume();
            } else if (isPlaying) {
              pause();
            } else {
              resume();
            }
          }}
          className="w-8 h-8 rounded-full bg-[#fcd400] text-[#003f87] flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          title={isPaused ? 'Resume Audio' : 'Pause Audio'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-[#003f87]" />
          ) : (
            <Play className="w-4 h-4 fill-[#003f87] ml-0.5" />
          )}
        </button>

        {/* Progress Bar / Waveform */}
        {playbackType === 'audio' && duration > 0 ? (
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div
              className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                seek(pos * duration);
              }}
            >
              <div
                className="bg-[#fcd400] h-full transition-all duration-100 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-sky-200 font-mono font-bold leading-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            {/* Animated Audio Waveform for Speech Synthesis */}
            <div className="flex items-center gap-1 h-4">
              {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8, 0.3].map((height, idx) => (
                <span
                  key={idx}
                  className={`w-1 bg-[#fcd400] rounded-full transition-all ${
                    isPlaying ? 'animate-pulse' : 'opacity-40'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(4, height * 16)}px` : '4px',
                    animationDelay: `${idx * 150}ms`,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-sky-200 font-bold truncate">
              {isPlaying
                ? (isFil ? 'Nagsasalaysay ng gabay sa pook...' : 'Narrating destination story...')
                : (isFil ? 'Naka-pause ang narasyon' : 'Narration paused')}
            </span>
          </div>
        )}
      </div>

      {/* Error notice if fallback was activated */}
      {error && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-200 font-medium">
          <AlertCircle className="w-3 h-3 text-[#fcd400] shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
};
