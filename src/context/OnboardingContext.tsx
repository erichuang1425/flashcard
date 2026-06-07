import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { Language } from '../i18n/translations';

interface OnboardingContextType {
  /** True once we know whether the signed-in user still needs the guide. */
  ready: boolean;
  /** Whether the first-run guide should currently be shown full-screen. */
  showOnboarding: boolean;
  /** Persist the chosen language, mark onboarding complete, and dismiss it. */
  completeOnboarding: (language: Language) => Promise<void>;
  /** Re-open the guide on demand (e.g. from Settings). */
  restartOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const prefsRef = (uid: string) => doc(db, 'users', uid, 'preferences', 'study');

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { setLanguage } = useLanguage();
  // null = still loading; true/false = whether the guide has been completed.
  const [completed, setCompleted] = useState<boolean | null>(null);
  // Lets the user replay the guide without clearing the completed flag.
  const [forced, setForced] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      setCompleted(null);
      setForced(false);
      return;
    }

    // A single read decides whether this account has finished the guide. A
    // brand-new account (Google or email) has no preferences doc yet, so the
    // guide is shown; the chosen language is then written back on completion.
    setCompleted(null);
    getDoc(prefsRef(user.uid))
      .then((snap) => {
        if (!active) return;
        const data = snap.data() as { onboardingCompleted?: boolean; language?: Language } | undefined;
        if (data?.language) setLanguage(data.language);
        setCompleted(data?.onboardingCompleted === true);
      })
      .catch(() => {
        // If the read fails we err toward showing the guide rather than
        // blocking a new user behind an error.
        if (active) setCompleted(false);
      });

    return () => {
      active = false;
    };
  }, [user, setLanguage]);

  const completeOnboarding = async (language: Language) => {
    setLanguage(language);
    if (user) {
      // Merge so we never clobber other preference fields written elsewhere.
      await setDoc(
        prefsRef(user.uid),
        { language, onboardingCompleted: true },
        { merge: true }
      );
    }
    setCompleted(true);
    setForced(false);
  };

  const restartOnboarding = () => setForced(true);

  const ready = !user || completed !== null;
  const showOnboarding = !!user && (forced || completed === false);

  return (
    <OnboardingContext.Provider
      value={{ ready, showOnboarding, completeOnboarding, restartOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
