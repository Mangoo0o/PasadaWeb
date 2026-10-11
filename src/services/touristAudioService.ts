import { useState, useEffect } from 'react';
import { TouristSpot } from '../types/database.types';
import { formatAudioSource } from '../utils/audioUtils';

export interface AudioPlayerState {
  activeSpot: TouristSpot | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  playbackType: 'audio' | 'speech' | 'none';
  error: string | null;
}

type AudioListener = (state: AudioPlayerState) => void;

class TouristAudioService {
  private audioElement: HTMLAudioElement | null = null;
  private currentSpot: TouristSpot | null = null;
  private currentLanguage: string = 'fil';
  private playbackType: 'audio' | 'speech' | 'none' = 'none';
  private isPaused: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private lastError: string | null = null;
  private listeners: Set<AudioListener> = new Set();
  private speechUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audioElement) return;

    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.setAttribute('playsinline', 'true');

    this.audioElement.addEventListener('play', () => {
      this.isPaused = false;
      this.notify();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPaused = true;
      this.notify();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime = this.audioElement.currentTime || 0;
        this.duration = this.audioElement.duration || 0;
        this.notify();
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        this.duration = this.audioElement.duration || 0;
        this.notify();
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.stop();
    });

    this.audioElement.addEventListener('error', () => {
      console.warn('Audio element failed to load source, attempting Speech Synthesis fallback');
      this.lastError = 'Audio file playback failed. Switching to voice guide.';
      // Fallback to text to speech narration
      if (this.currentSpot) {
        this.playSpeechGuide(this.currentSpot, this.currentLanguage);
      } else {
        this.stop();
      }
    });
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): AudioPlayerState {
    const isPlayingAudio = !!(this.audioElement && !this.audioElement.paused && !this.audioElement.ended && this.audioElement.currentTime > 0);
    const isPlayingSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused;
    const isPlaying = this.playbackType === 'audio' ? isPlayingAudio : this.playbackType === 'speech' ? isPlayingSpeech : false;

    return {
      activeSpot: this.currentSpot,
      isPlaying,
      isPaused: this.isPaused,
      currentTime: this.currentTime,
      duration: this.duration,
      playbackType: this.playbackType,
      error: this.lastError,
    };
  }

  /**
   * Toggle playback for a tourist spot
   */
  public toggleSpot(spot: TouristSpot, language: string = 'fil'): void {
    if (this.currentSpot?.id === spot.id) {
      if (this.isPaused) {
        this.resume();
      } else {
        this.stop();
      }
    } else {
      this.playSpot(spot, language);
    }
  }

  /**
   * Start playing audio guide for a tourist spot.
   * If spot.audio_url is valid, streams the audio file.
   * If spot.audio_url is missing or invalid, narrates via Web Speech API.
   */
  public playSpot(spot: TouristSpot, language: string = 'fil'): void {
    this.stop(false); // Stop current without clearing error
    this.currentSpot = spot;
    this.currentLanguage = language;
    this.lastError = null;

    const formattedAudioUrl = formatAudioSource(spot.audio_url);

    if (formattedAudioUrl) {
      this.playAudioFile(formattedAudioUrl);
    } else {
      this.playSpeechGuide(spot, language);
    }
  }

  private playAudioFile(src: string): void {
    if (!this.audioElement) {
      this.initAudioElement();
    }

    if (!this.audioElement) return;

    try {
      this.playbackType = 'audio';
      this.isPaused = false;
      this.currentTime = 0;
      this.audioElement.src = src;
      this.audioElement.load();

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.notify();
          })
          .catch((err) => {
            console.warn('Audio play() rejected, falling back to speech guide:', err);
            if (this.currentSpot) {
              this.playSpeechGuide(this.currentSpot, this.currentLanguage);
            }
          });
      }
    } catch (err: any) {
      console.warn('Audio play exception, trying speech fallback:', err);
      if (this.currentSpot) {
        this.playSpeechGuide(this.currentSpot, this.currentLanguage);
      }
    }
  }

  /**
   * Text-To-Speech Narrator for tourist spots
   */
  private playSpeechGuide(spot: TouristSpot, language: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.lastError = 'Audio playback is not supported on this device.';
      this.playbackType = 'none';
      this.notify();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const isFil = language === 'fil' || language === 'tl';
      const cleanDesc = (isFil && spot.tagalog_description ? spot.tagalog_description : spot.description || '')
        .replace(/LGU Ordinance Rate Schedule/gi, '')
        .replace(/\[icon:[^\]]+\]/gi, '')
        .trim();

      const narrationText = isFil
        ? `Maligayang pagdating sa ${spot.name}. ${cleanDesc} Pamasahe sa tricycle: humigit-kumulang ${spot.est_tricycle_fare || 20} pesos mula sa pinakamalapit na terminal.`
        : `Welcome to ${spot.name}. ${cleanDesc} Estimated tricycle fare is ${spot.est_tricycle_fare || 20} pesos from the nearest terminal.`;

      const utterance = new SpeechSynthesisUtterance(narrationText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = isFil ? 'fil-PH' : 'en-US';

      // Pick localized voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const langVoice = voices.find(
          (v) => v.lang.startsWith(isFil ? 'fil' : 'en') || v.lang.startsWith(isFil ? 'tl' : 'en')
        );
        if (langVoice) {
          utterance.voice = langVoice;
        }
      }

      utterance.onstart = () => {
        this.playbackType = 'speech';
        this.isPaused = false;
        this.notify();
      };

      utterance.onpause = () => {
        this.isPaused = true;
        this.notify();
      };

      utterance.onresume = () => {
        this.isPaused = false;
        this.notify();
      };

      utterance.onend = () => {
        this.stop();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        this.stop();
      };

      this.speechUtterance = utterance;
      this.playbackType = 'speech';
      this.isPaused = false;
      window.speechSynthesis.speak(utterance);
      this.notify();
    } catch (err: any) {
      console.warn('Speech narration error:', err);
      this.stop();
    }
  }

  public pause(): void {
    if (this.playbackType === 'audio' && this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.isPaused = true;
      this.notify();
    } else if (this.playbackType === 'speech' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.isPaused = true;
      this.notify();
    }
  }

  public resume(): void {
    if (this.playbackType === 'audio' && this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => {});
      this.isPaused = false;
      this.notify();
    } else if (this.playbackType === 'speech' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.isPaused = false;
      this.notify();
    }
  }

  public seek(seconds: number): void {
    if (this.playbackType === 'audio' && this.audioElement && isFinite(seconds)) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration || 0));
      this.currentTime = this.audioElement.currentTime;
      this.notify();
    }
  }

  public stop(clearError: boolean = true): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.currentSpot = null;
    this.playbackType = 'none';
    this.isPaused = false;
    this.currentTime = 0;
    this.duration = 0;
    if (clearError) {
      this.lastError = null;
    }
    this.notify();
  }
}

export const touristAudioService = new TouristAudioService();

/**
 * React Hook for consuming the active tourist audio guide state
 */
export const useTouristAudio = () => {
  const [state, setState] = useState<AudioPlayerState>(() => touristAudioService.getState());

  useEffect(() => {
    return touristAudioService.subscribe((next) => {
      setState(next);
    });
  }, []);

  return {
    ...state,
    playSpot: (spot: TouristSpot, lang?: string) => touristAudioService.playSpot(spot, lang),
    toggleSpot: (spot: TouristSpot, lang?: string) => touristAudioService.toggleSpot(spot, lang),
    pause: () => touristAudioService.pause(),
    resume: () => touristAudioService.resume(),
    stop: () => touristAudioService.stop(),
    seek: (sec: number) => touristAudioService.seek(sec),
  };
};
