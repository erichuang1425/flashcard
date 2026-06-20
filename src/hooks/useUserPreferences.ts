import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { UserPreferences } from '../types';

// Re-exported so existing importers (e.g. `useUserSettings`) keep their import
// path while the canonical definition lives in `../types`.
export type { UserPreferences };

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'study'));
        if (prefsDoc.exists()) {
          setPreferences(prefsDoc.data() as UserPreferences);
        } else {
          // Set default preferences
          const defaultPrefs: UserPreferences = {
            theme: 'system',
            studySessionLength: 20,
            dailyGoal: 30,
            notifications: true,
            audioEnabled: true,
            autoPlayAudio: false,
            language: 'en',
            onboardingCompleted: false,
            pomodoroSettings: {
              workDuration: 25,
              breakDuration: 5,
              longBreakDuration: 15,
              sessionsUntilLongBreak: 4
            }
          };
          await setDoc(doc(db, 'users', user.uid, 'preferences', 'study'), defaultPrefs);
          setPreferences(defaultPrefs);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load preferences'));
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user || !preferences) return;

    try {
      // Persist only the changed fields with `merge: true`. Writing the whole
      // document would clobber preference fields this in-memory copy doesn't
      // track — e.g. `onboardingCompleted`, written directly by
      // `OnboardingProvider` — reverting them whenever any screen saves.
      await setDoc(doc(db, 'users', user.uid, 'preferences', 'study'), newPrefs, {
        merge: true,
      });
      setPreferences({ ...preferences, ...newPrefs });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
      throw err;
    }
  };

  return { preferences, loading, error, updatePreferences };
};
