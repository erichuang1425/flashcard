// Thin, resilient wrapper around the browser Web Speech API (SpeechSynthesis).
//
// We use the platform's built-in text-to-speech so pronunciation works
// client-side with no API key, no cost and no network round-trip — and so the
// user can pick from the high-quality neural voices their OS already ships
// (Siri voices on macOS/iOS, Google voices on Chrome/Android, etc.).

export interface SpeakOptions {
  /** voiceURI of the SpeechSynthesisVoice to use. Falls back to the default. */
  voiceURI?: string;
  /** Speaking rate, 0.5–2 (1 = normal). */
  rate?: number;
  /** Voice pitch, 0–2 (1 = normal). */
  pitch?: number;
}

/** Whether the current browser exposes speech synthesis at all. */
export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Voices populate asynchronously in most browsers — the first getVoices()
 * call often returns []. This resolves once the list is actually available,
 * resolving immediately if voices are already loaded.
 */
export const loadVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([]);
      return;
    }

    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.onvoiceschanged = finish;
    // Safety net: some browsers never fire the event but do populate the list.
    setTimeout(finish, 1000);
  });

/** Keep only voices that can pronounce English. */
export const getEnglishVoices = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] =>
  voices.filter((v) => v.lang.toLowerCase().startsWith('en'));

// Names that tend to mark higher-quality / neural voices across platforms.
const QUALITY_HINTS = ['natural', 'neural', 'enhanced', 'premium', 'google', 'siri'];

/**
 * Pick a sensible default English voice: prefer a high-quality en-US voice,
 * then any en-US voice, then the browser default, then anything English.
 */
export const pickDefaultVoice = (
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined => {
  const english = getEnglishVoices(voices);
  if (english.length === 0) return undefined;

  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0;
    const name = v.name.toLowerCase();
    if (QUALITY_HINTS.some((h) => name.includes(h))) s += 4;
    if (v.lang.toLowerCase() === 'en-us') s += 2;
    else if (v.lang.toLowerCase() === 'en-gb') s += 1;
    if (v.default) s += 1;
    if (v.localService) s += 1; // local voices are lower-latency and offline
    return s;
  };

  return [...english].sort((a, b) => score(b) - score(a))[0];
};

/** A short, human-friendly accent label for a voice's language tag. */
export const accentLabel = (lang: string): string => {
  const map: Record<string, string> = {
    'en-us': 'American',
    'en-gb': 'British',
    'en-au': 'Australian',
    'en-ca': 'Canadian',
    'en-in': 'Indian',
    'en-ie': 'Irish',
    'en-za': 'South African',
    'en-nz': 'New Zealand',
  };
  return map[lang.toLowerCase()] || lang;
};

/**
 * Speak the given text. Cancels any in-flight utterance first so rapid taps
 * never queue up. Returns the utterance (for wiring up onend/onerror) or null
 * when speech isn't supported.
 */
export const speak = (
  text: string,
  voices: SpeechSynthesisVoice[],
  options: SpeakOptions = {}
): SpeechSynthesisUtterance | null => {
  if (!isSpeechSupported() || !text.trim()) return null;

  // Cancel anything currently speaking for snappy, non-overlapping playback.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = options.voiceURI
    ? voices.find((v) => v.voiceURI === options.voiceURI)
    : undefined;
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'en-US';
  }
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;

  window.speechSynthesis.speak(utterance);
  return utterance;
};

/** Stop any current speech immediately. */
export const cancelSpeech = (): void => {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
};
