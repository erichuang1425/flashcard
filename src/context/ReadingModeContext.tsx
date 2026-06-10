import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { updateArticleProgress } from '../services/articleService';
import {
  Article,
  ArticleProgress,
  DEFAULT_READING_PREFERENCES,
  ReadingPreferences,
} from '../types/reading';

interface ReadingModeContextValue {
  currentArticle: Article | null;
  setCurrentArticle: React.Dispatch<React.SetStateAction<Article | null>>;
  isReading: boolean;
  startReading: () => void;
  stopReading: () => void;
  updateProgress: (progress: Partial<ArticleProgress>) => Promise<void>;
  readingSettings: ReadingPreferences;
  settingsLoading: boolean;
  updateSettings: (settings: Partial<ReadingPreferences>) => Promise<void>;
}

const ReadingModeContext = createContext<ReadingModeContextValue | null>(null);

export const ReadingModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readingSettings, setReadingSettings] = useState<ReadingPreferences>(
    DEFAULT_READING_PREFERENCES
  );
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      if (!user) {
        if (active) setSettingsLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(
          doc(db, 'users', user.uid, 'preferences', 'reading')
        );
        if (active && snapshot.exists()) {
          setReadingSettings({
            ...DEFAULT_READING_PREFERENCES,
            ...(snapshot.data() as Partial<ReadingPreferences>),
          });
        }
      } finally {
        if (active) setSettingsLoading(false);
      }
    };

    setSettingsLoading(true);
    void loadSettings();
    return () => {
      active = false;
    };
  }, [user]);

  const updateProgress = useCallback(
    async (progress: Partial<ArticleProgress>) => {
      if (!user || !currentArticle) return;

      const updatedProgress = await updateArticleProgress(
        user.uid,
        currentArticle.id,
        progress
      );
      setCurrentArticle((article) =>
        article
          ? {
              ...article,
              progress: updatedProgress,
              lastRead: updatedProgress.lastRead ?? article.lastRead,
            }
          : article
      );
    },
    [currentArticle, user]
  );

  const updateSettings = useCallback(
    async (settings: Partial<ReadingPreferences>) => {
      if (!user) return;

      const updated = { ...readingSettings, ...settings };
      setReadingSettings(updated);
      await setDoc(
        doc(db, 'users', user.uid, 'preferences', 'reading'),
        updated,
        { merge: true }
      );
    },
    [readingSettings, user]
  );

  const startReading = useCallback(() => setIsReading(true), []);
  const stopReading = useCallback(() => setIsReading(false), []);

  const value = useMemo<ReadingModeContextValue>(
    () => ({
      currentArticle,
      setCurrentArticle,
      isReading,
      startReading,
      stopReading,
      updateProgress,
      readingSettings,
      settingsLoading,
      updateSettings,
    }),
    [
      currentArticle,
      isReading,
      readingSettings,
      settingsLoading,
      startReading,
      stopReading,
      updateProgress,
      updateSettings,
    ]
  );

  return (
    <ReadingModeContext.Provider value={value}>
      {children}
    </ReadingModeContext.Provider>
  );
};

export const useReadingMode = (): ReadingModeContextValue => {
  const context = useContext(ReadingModeContext);
  if (!context) {
    throw new Error('useReadingMode must be used within a ReadingModeProvider');
  }
  return context;
};
