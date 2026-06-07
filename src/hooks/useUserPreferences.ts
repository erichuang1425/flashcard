import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  studySessionLength: number;
  dailyGoal: number;
  notifications: boolean;
  audioEnabled: boolean;
  autoPlayAudio: boolean;
  language: 'en' | 'zh';
  /** Set once the user finishes (or skips) the first-run beginner guide. */
  onboardingCompleted?: boolean;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    longBreakDuration: number;
    sessionsUntilLongBreak: number;
  };
}

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
