import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useUserPreferences } from './UserPreferencesContext';
import { doc, DocumentData, DocumentReference, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ReadingProgress {
  articleId: string;
  progress: number;
  lastPosition: number;
  timeSpent: number;
  wordsRead: number;
  readingSpeed: number;
  startTime?: number;
  lastCalculation?: number;
}

export interface ReadingProgressMap {
  [articleId: string]: ReadingProgress;
}

interface ReadingModeContextType {
  currentArticle: Article | null;
  readingProgress: ReadingProgressMap;  // Changed from ReadingProgress | null
  isReading: boolean;
  setCurrentArticle: (article: Article | null) => void;
  updateProgress: (progress: Partial<ReadingProgress>) => Promise<void>;
  startReading: () => void;
  stopReading: () => void;
  isReadingMode: boolean;
  setReadingMode: (enabled: boolean) => Promise<void>;
  readingSettings: {
    fontSize: number;
    focusMode: boolean;
    theme: 'light' | 'dark' | 'sepia';
  };
  updateSettings: (settings: Partial<ReadingModeContextType['readingSettings']>) => Promise<void>;
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  coverImage?: string;
  readingTime: number;
  wordCount: number;
  sourceUrl?: string;
  createdAt: string;
  readCount: number;
  progress: ArticleProgress;
}

interface ArticleProgress {
  wordsRead: number;
  lastPosition: number;
  completed: boolean;
}

const ReadingModeContext = createContext<ReadingModeContextType | null>(null);

export const ReadingModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgressMap>({});
  const [isReading, setIsReading] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [readingSettings, setReadingSettings] = useState<ReadingModeContextType['readingSettings']>({
    fontSize: 16,
    focusMode: false,
    theme: 'light'
  });

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!user || !currentArticle) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'readingProgress', currentArticle.id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as ReadingProgress;
          setReadingProgress({ [currentArticle.id]: data });
        }
      }
    );

    return () => unsubscribe();
  }, [user, currentArticle]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'preferences', 'reading'), 
      (doc) => {
        if (doc.exists()) {
          setReadingSettings(doc.data() as any);
          setIsReadingMode(doc.data()?.isEnabled || false);
        }
    });

    return () => unsubscribe();
  }, [user]);

  const updateProgress = useCallback(async (progress: Partial<ReadingProgress>) => {
    if (!user || !currentArticle || !mountedRef.current) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      try {
        const progressRef = doc(db, 'users', user.uid, 'readingProgress', currentArticle.id);
        const newProgress = {
          ...readingProgress[currentArticle.id],
          ...progress,
          lastUpdated: new Date().toISOString()
        };

        await setDoc(progressRef, newProgress, { merge: true });
        
        if (mountedRef.current) {
          setReadingProgress(prev => ({
            ...prev,
            [currentArticle.id]: newProgress
          }));
        }
      } catch (error) {
        console.error('Failed to update reading progress:', error);
      }
    }, 1000);
  }, [user, currentArticle, readingProgress]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const updateReadingSpeed = async () => {
    if (!readingProgress?.startTime || !currentArticle) return;

    const now = Date.now();
    const timeElapsed = (now - (readingProgress[currentArticle.id]?.startTime || 0)) / 60000; // minutes
    const speed = Math.round((readingProgress[currentArticle.id]?.wordsRead || 0) / timeElapsed);

    await updateProgress({
      readingSpeed: speed,
      lastCalculation: now
    });
  };

  useEffect(() => {
    if (!isReading || !currentArticle) return;

    const interval = setInterval(updateReadingSpeed, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [isReading, currentArticle, readingProgress]);

  const setReadingMode = async (enabled: boolean) => {
    if (!user) return;
    
    await setDoc(doc(db, 'users', user.uid, 'preferences', 'reading'), {
      isEnabled: enabled,
      lastModeSwitch: new Date().toISOString(),
      ...readingSettings
    }, { merge: true });
  };

  const updateSettings = async (newSettings: Partial<typeof readingSettings>) => {
    if (!user) return;
    
    const updated = { ...readingSettings, ...newSettings };
    setReadingSettings(updated);
    
    await setDoc(doc(db, 'users', user.uid, 'preferences', 'reading'), {
      isEnabled: isReadingMode,
      ...updated
    }, { merge: true });
  };

  const startReading = () => setIsReading(true);
  const stopReading = () => setIsReading(false);

  return (
    <ReadingModeContext.Provider 
      value={{
        currentArticle,
        readingProgress,
        isReading,
        setCurrentArticle,
        updateProgress,
        startReading,
        stopReading,
        isReadingMode,
        setReadingMode,
        readingSettings,
        updateSettings
      }}
    >
      {children}
    </ReadingModeContext.Provider>
  );
};

export const useReadingMode = () => {
  const context = useContext(ReadingModeContext);
  if (!context) {
    throw new Error('useReadingMode must be used within a ReadingModeProvider');
  }
  return context;
};


