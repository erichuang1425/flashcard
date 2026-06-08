// Plays a short notification cue when a Pomodoro interval ends.
//
// The cue is a brief WebAudio tone (no asset to ship/fetch) plus a vibration
// fallback. Two iOS realities shape this:
//   1. An AudioContext created/resumed outside a user gesture starts in the
//      `suspended` state and produces no sound. The Pomodoro cue fires from a
//      timer callback (never a gesture), so we keep ONE shared context and
//      `resume()` it from a real gesture via `primeNotificationAudio()` (called
//      when the user starts the timer). Reusing it also avoids leaking a new
//      AudioContext per interval.
//   2. `navigator.vibrate` is not implemented in iOS Safari, so the vibration
//      fallback is effectively Android-only. It stays as best-effort.
// Everything degrades silently if the browser blocks it.

type WindowWithWebkitAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

let sharedCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedCtx;
};

/**
 * Resume the shared AudioContext from within a user gesture (e.g. when the
 * Pomodoro timer is started) so iOS will later allow the timer-driven cue.
 * Safe to call repeatedly; a no-op where unsupported.
 */
export const primeNotificationAudio = (): void => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    /* non-essential */
  }
};

export const playNotificationCue = (): void => {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(200);
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    // iOS may have re-suspended the context; resume() here is a best-effort
    // recovery (it only works if a gesture has unlocked audio at least once).
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;

    // Quick attack/decay envelope so it reads as a chime, not a click.
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    oscillator.start(now);
    oscillator.stop(now + 0.4);
  } catch {
    // Audio/vibration are non-essential; ignore failures (blocked autoplay,
    // unsupported APIs, etc.).
  }
};
