import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  isSpeechSupported,
  loadVoices,
  getEnglishVoices,
  pickDefaultVoice,
  speak as speakUtil,
  cancelSpeech,
} from '../utils/speech';

const STORAGE_KEY = 'flashcard:pronunciation';

export interface PronunciationSettings {
  /** voiceURI of the chosen SpeechSynthesisVoice ('' = browser default). */
  voiceURI: string;
  /** Speaking rate, 0.5–2. */
  rate: number;
  /** Voice pitch, 0–2. */
  pitch: number;
  /** Speak the word automatically when a new card appears. */
  autoSpeak: boolean;
}

const DEFAULT_SETTINGS: PronunciationSettings = {
  voiceURI: '',
  rate: 0.9, // slightly slower than normal — easier to follow when learning
  pitch: 1,
  autoSpeak: false,
};

interface PronunciationContextValue extends PronunciationSettings {
  /** Whether the browser supports speech synthesis at all. */
  supported: boolean;
  /** English voices available on this device. */
  voices: SpeechSynthesisVoice[];
  /** True while audio is actively playing. */
  speaking: boolean;
  /** Speak a word/phrase with the current voice & rate. */
  speak: (text: string) => void;
  /** Stop any in-progress speech. */
  stop: () => void;
  /** Patch one or more settings (persisted instantly to localStorage). */
  updateSettings: (patch: Partial<PronunciationSettings>) => void;
}

const PronunciationContext = createContext<PronunciationContextValue | undefined>(undefined);

const loadStored = (): PronunciationSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_SETTINGS;
};

export const PronunciationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PronunciationSettings>(loadStored);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const supported = isSpeechSupported();
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Load the device's English voices once they're available, and auto-pick a
  // good default the first time (when the user hasn't chosen one yet).
  useEffect(() => {
    let cancelled = false;
    loadVoices().then((all) => {
      if (cancelled) return;
      const english = getEnglishVoices(all);
      setVoices(english);
      setSettings((prev) => {
        if (prev.voiceURI && english.some((v) => v.voiceURI === prev.voiceURI)) {
          return prev; // keep the user's existing valid choice
        }
        const fallback = pickDefaultVoice(all);
        return fallback ? { ...prev, voiceURI: fallback.voiceURI } : prev;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist every change immediately so the picker feels instant and the
  // choice survives reloads without a Firestore round-trip.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, [settings]);

  // iOS Safari refuses to play speech that wasn't initiated by a user gesture,
  // and stays "locked" until the first one. Auto-speak (driven by a card-change
  // effect, not a tap) therefore never fires on iOS — and even the first manual
  // tap can be swallowed. Unlock the engine on the first interaction by speaking
  // a silent utterance inside that gesture; harmless no-op on other platforms.
  useEffect(() => {
    if (!supported) return;
    const unlock = () => {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch {
        /* best-effort; ignore */
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [supported]);

  // Stop any speech if the component unmounts (e.g. navigation).
  useEffect(() => () => cancelSpeech(), []);

  const updateSettings = useCallback((patch: Partial<PronunciationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const speak = useCallback(
    (text: string) => {
      const utterance = speakUtil(text, voices, {
        voiceURI: settings.voiceURI || undefined,
        rate: settings.rate,
        pitch: settings.pitch,
      });
      if (!utterance) return;
      currentUtterance.current = utterance;
      setSpeaking(true);
      const done = () => {
        if (currentUtterance.current === utterance) {
          setSpeaking(false);
          currentUtterance.current = null;
        }
      };
      utterance.onend = done;
      utterance.onerror = done;
    },
    [voices, settings.voiceURI, settings.rate, settings.pitch]
  );

  const stop = useCallback(() => {
    cancelSpeech();
    setSpeaking(false);
    currentUtterance.current = null;
  }, []);

  const value: PronunciationContextValue = {
    ...settings,
    supported,
    voices,
    speaking,
    speak,
    stop,
    updateSettings,
  };

  return (
    <PronunciationContext.Provider value={value}>{children}</PronunciationContext.Provider>
  );
};

export const usePronunciation = (): PronunciationContextValue => {
  const ctx = useContext(PronunciationContext);
  if (!ctx) {
    throw new Error('usePronunciation must be used within a PronunciationProvider');
  }
  return ctx;
};
