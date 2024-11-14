import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  audioEnabled: boolean;
  dailyGoal: number;
  studySessionLength: number;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    autoStartBreak: boolean;
  };
  studyVocabLimit: number;
  language: 'en' | 'zh-TW';
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: true,
  audioEnabled: true,
  dailyGoal: 30,
  studySessionLength: 20,
  pomodoroSettings: {
    workDuration: 25,
    breakDuration: 5,
    autoStartBreak: false
  },
  studyVocabLimit: 20,
  language: 'en'
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return context;
};

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  const validatePreferences = (prefs: UserPreferences): UserPreferences => {
    const ensureNumber = (value: any, min: number, max: number, defaultValue: number): number => {
      const num = parseInt(String(value));
      if (isNaN(num)) return defaultValue;
      return Math.min(Math.max(num, min), max);
    };

    return {
      ...prefs,
      dailyGoal: ensureNumber(prefs.dailyGoal, 5, 240, defaultPreferences.dailyGoal),
      studySessionLength: ensureNumber(prefs.studySessionLength, 5, 120, defaultPreferences.studySessionLength),
      studyVocabLimit: ensureNumber(prefs.studyVocabLimit, 5, 100, defaultPreferences.studyVocabLimit),
      pomodoroSettings: {
        ...prefs.pomodoroSettings,
        workDuration: ensureNumber(prefs.pomodoroSettings.workDuration, 5, 60, defaultPreferences.pomodoroSettings.workDuration),
        breakDuration: ensureNumber(prefs.pomodoroSettings.breakDuration, 1, 30, defaultPreferences.pomodoroSettings.breakDuration)
      },
      language: ['en', 'zh-TW'].includes(prefs.language) ? prefs.language : defaultPreferences.language
    };
  };

  const saveToDatabase = async (prefs: UserPreferences) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'preferences', 'settings'),
        prefs,
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving to database:', err);
      throw new Error('Failed to save preferences');
    }
  };

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    try {
      const newPrefs = {
        ...preferences,
        [key]: value,
      };
      const validatedPrefs = validatePreferences(newPrefs);
      await saveToDatabase(validatedPrefs);
      setPreferences(validatedPrefs);
    } catch (err) {
      console.error('Error updating preference:', err);
      throw err;
    }
  };

  // Load preferences from Firestore
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'settings'));
        
        if (prefsDoc.exists()) {
          const loadedPrefs = prefsDoc.data() as UserPreferences;
          const validatedPrefs = validatePreferences(loadedPrefs);
          setPreferences(validatedPrefs);
          
          // If validation changed values, update database
          if (JSON.stringify(loadedPrefs) !== JSON.stringify(validatedPrefs)) {
            await saveToDatabase(validatedPrefs);
          }
        } else {
          await saveToDatabase(defaultPreferences);
          setPreferences(defaultPreferences);
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Debounced save on preferences change
  useEffect(() => {
    if (isLoading) return; // Don't save while loading
    
    const timeoutId = setTimeout(async () => {
      try {
        const validatedPrefs = validatePreferences(preferences);
        if (JSON.stringify(validatedPrefs) !== JSON.stringify(preferences)) {
          setPreferences(validatedPrefs);
        } else {
          await saveToDatabase(validatedPrefs);
        }
      } catch (err) {
        console.error('Error saving preferences:', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [preferences, user, isLoading]);

  return (
    <UserPreferencesContext.Provider value={{ 
      preferences, 
      setPreferences, 
      updatePreference,
      isLoading 
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};