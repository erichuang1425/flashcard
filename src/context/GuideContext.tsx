import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// Contextual, in-place guidance ("coach marks").
//
// Instead of asking a brand-new user to memorise an eight-slide tour up front,
// the app teaches each feature where it actually lives: a small, dismissible
// tip points at the relevant control the first time the user reaches it. This
// context is the brain behind that — it remembers which tips have been seen and
// shows at most one at a time so the experience guides rather than overwhelms.
//
// State lives in localStorage (per device) rather than Firestore: it's purely a
// presentation concern, changes constantly, and must work instantly offline
// without spending a write on every "Got it".

const STORAGE_KEY = 'flashcards.guide.v1';

interface PersistedState {
  /** Master switch — when false, no contextual tips are shown anywhere. */
  enabled: boolean;
  /** Ids of tips the user has already dismissed. */
  seen: string[];
}

interface RegisteredTip {
  id: string;
  /** Lower numbers win when several tips are visible on the same screen. */
  order: number;
}

interface GuideContextType {
  /** Whether contextual tips are currently switched on. */
  tipsEnabled: boolean;
  /** Turn the whole contextual-tip system on or off. */
  setTipsEnabled: (enabled: boolean) => void;
  /** The id of the single tip that should be visible right now, if any. */
  activeTipId: string | null;
  /** Called by a tip when it mounts so the context can sequence it. */
  registerTip: (tip: RegisteredTip) => void;
  /** Called by a tip when it unmounts (e.g. the user navigates away). */
  unregisterTip: (id: string) => void;
  /** Mark a tip as seen and advance to the next one. */
  dismissTip: (id: string) => void;
  /** Forget every dismissed tip so the contextual guidance runs again. */
  resetTips: () => void;
}

const GuideContext = createContext<GuideContextType | null>(null);

const loadState = (): PersistedState => {
  if (typeof window === 'undefined') return { enabled: true, seen: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: true, seen: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      enabled: parsed.enabled !== false,
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],
    };
  } catch {
    return { enabled: true, seen: [] };
  }
};

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(loadState);
  // Tips currently mounted on screen, keyed by id. Kept in React state (not a
  // ref) so changes re-evaluate which tip is active.
  const [registered, setRegistered] = useState<RegisteredTip[]>([]);

  // Persist whenever the seen/enabled state changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage-disabled browsers keep the in-memory copy for this session.
    }
  }, [state]);

  const registerTip = useCallback((tip: RegisteredTip) => {
    setRegistered((prev) =>
      prev.some((t) => t.id === tip.id) ? prev : [...prev, tip]
    );
  }, []);

  const unregisterTip = useCallback((id: string) => {
    setRegistered((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissTip = useCallback((id: string) => {
    setState((prev) =>
      prev.seen.includes(id) ? prev : { ...prev, seen: [...prev.seen, id] }
    );
  }, []);

  const setTipsEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled }));
  }, []);

  const resetTips = useCallback(() => {
    setState((prev) => ({ ...prev, enabled: true, seen: [] }));
  }, []);

  // The active tip is the lowest-ordered registered tip the user hasn't seen.
  // Showing only one at a time turns a screen full of callouts into a calm,
  // guided sequence.
  const activeTipId = useMemo(() => {
    if (!state.enabled) return null;
    const candidates = registered
      .filter((t) => !state.seen.includes(t.id))
      .sort((a, b) => a.order - b.order);
    return candidates[0]?.id ?? null;
  }, [registered, state.enabled, state.seen]);

  const value = useMemo(
    () => ({
      tipsEnabled: state.enabled,
      setTipsEnabled,
      activeTipId,
      registerTip,
      unregisterTip,
      dismissTip,
      resetTips,
    }),
    [state.enabled, setTipsEnabled, activeTipId, registerTip, unregisterTip, dismissTip, resetTips]
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
};

export const useGuide = (): GuideContextType => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
};
