import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { UserPreferences } from '../types';

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
          const defaultPrefs: UserPreferences = {
            theme: 'system',
            notifications: true,
            audioEnabled: true,
            dailyGoal: 30,
            studySessionLength: 20,
            studyVocabLimit: 20,
            language: 'en',
            appMode: 'flashcards',
            readingSettings: {
              fontSize: 16,
              lineHeight: 1.5,
              fontFamily: 'system-ui',
              enableTTS: false,
              autoScroll: false,
              highlightColor: '#ffeb3b',
              focusModeEnabled: false,
              theme: 'light'
            },
            pomodoroSettings: {
              workDuration: 25,
              breakDuration: 5,
              autoStartBreak: false
            },
            preloadBatchSize: 5,
            cacheTimeout: 5,
            studySettings: {
              srsType: 'interval',
              defaultNewCardsPerDay: 30,
              defaultReviewsPerDay: 50
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
      const updatedPrefs = { ...preferences, ...newPrefs };
      await setDoc(doc(db, 'users', user.uid, 'preferences', 'study'), updatedPrefs);
      setPreferences(updatedPrefs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
      throw err;
    }
  };

  return { preferences, loading, error, updatePreferences };
};
