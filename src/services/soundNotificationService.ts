/**
 * Sound & Device Notification Service for PasadaGuide
 * Uses Web Audio API for zero-latency, device-like notification tones that work 100% offline,
 * coupled with native Browser Notifications (for native OS sound/banner) and Haptic Vibration.
 */

class SoundNotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('pasada_sound_enabled');
      this.soundEnabled = stored !== 'false';
    } catch {
      this.soundEnabled = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('pasada_sound_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  public toggleSound(): boolean {
    const next = !this.soundEnabled;
    this.setSoundEnabled(next);
    if (next) {
      this.playTone([660, 880], [0.08, 0.12]);
    }
    return next;
  }

  /**
   * Request native browser notification permission
   */
  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      if (Notification.permission === 'default') {
        return await Notification.requestPermission();
      }
      return Notification.permission;
    } catch {
      return 'unsupported';
    }
  }

  /**
   * Show native device notification (triggers native OS notification sound and banner)
   */
  public showDeviceNotification(title: string, body: string, icon = '/favicon.svg'): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon,
          badge: icon,
          tag: 'pasada-alert',
          silent: false
        });
      }
    } catch {}
  }

  /**
   * Play standard tone sequence via Web Audio API
   */
  private playTone(frequencies: number[], durations: number[], type: OscillatorType = 'sine'): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    let startTime = ctx.currentTime + 0.02;
    frequencies.forEach((freq, idx) => {
      const duration = durations[idx] || 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      startTime += duration + 0.04;
    });

    // Trigger haptic vibration on mobile devices
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([180, 80, 180]);
      } catch {}
    }
  }

  /**
   * Dispatch Alert: Upbeat high-contrast chime for incoming ride requests
   */
  public playDispatchAlert(details?: { pickupName?: string; fare?: number }): void {
    // Two-tone attention bell: 659Hz (E5) -> 880Hz (A5) -> 1046Hz (C6)
    this.playTone([659, 880, 1046], [0.12, 0.12, 0.22], 'triangle');
    
    if (details?.pickupName) {
      this.showDeviceNotification(
        'Bagong Pasada Request!',
        `Pickup: ${details.pickupName} • ₱${details.fare || 20}`
      );
    }
  }

  /**
   * Driver Arrived Alert: Triple melodic chime for passenger
   */
  public playDriverArrivedAlert(driverName?: string): void {
    // Ascending warm chord: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
    this.playTone([523, 659, 784], [0.1, 0.1, 0.25], 'sine');
    
    this.showDeviceNotification(
      'Nandito na ang iyong drayber!',
      driverName ? `${driverName} ay nasa pickup location na.` : 'Nasa pickup location na ang tricycle.'
    );
  }

  /**
   * Message Pop: Crisp, friendly pop chime for in-trip chat
   */
  public playMessagePop(senderName?: string, messageText?: string): void {
    this.playTone([740, 987], [0.07, 0.14], 'sine');

    if (senderName && messageText) {
      this.showDeviceNotification(
        `Mensahe mula kay ${senderName}`,
        messageText
      );
    }
  }

  /**
   * Trip Completed Alert: Success chime
   */
  public playTripCompletedAlert(): void {
    this.playTone([523, 659, 784, 1046], [0.08, 0.08, 0.08, 0.25], 'sine');
  }
}

export const soundService = new SoundNotificationService();
