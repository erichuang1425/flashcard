// Plays a short notification cue when a Pomodoro interval ends.
//
// The previous implementation loaded `/notification.mp3`, an asset that does
// not exist in `public/`, so the transition was always silent (the error was
// swallowed). This synthesizes a brief tone with the WebAudio API instead — no
// asset to ship or fetch — and adds a vibration fallback for mobile, where
// autoplay audio is frequently blocked. Everything is best-effort and degrades
// silently if the browser blocks it.
export const playNotificationCue = (): void => {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(200);
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
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
    oscillator.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Audio/vibration are non-essential; ignore failures (blocked autoplay,
    // unsupported APIs, etc.).
  }
};
