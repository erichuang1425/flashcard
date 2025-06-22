import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UIState {
  focusMode: boolean;
  fullscreen: boolean;
  readingMode: boolean;
  isFocusSession: boolean;
  lastScrollPosition: number;
}

interface UIStateContextType {
  uiState: UIState;
  toggleFocusMode: () => void;
  toggleFullscreen: (element?: HTMLElement) => void;
  setReadingMode: (value: boolean) => void;
  startFocusSession: () => void;
  endFocusSession: () => void;
}

const UIStateContext = createContext<UIStateContextType | null>(null);

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};

export const UIStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [uiState, setUIState] = useState<UIState>({
    focusMode: false,
    fullscreen: false,
    readingMode: false,
    isFocusSession: false,
    lastScrollPosition: 0
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'preferences', 'ui-state'),
      (doc) => {
        if (doc.exists()) {
          setUIState(doc.data() as UIState);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateState = async (updates: Partial<UIState>) => {
    if (!user) return;

    const newState = { ...uiState, ...updates };
    setUIState(newState);

    try {
      await setDoc(doc(db, 'users', user.uid, 'preferences', 'ui-state'), newState, { merge: true });
    } catch (error) {
      console.error('Failed to update UI state:', error);
    }
  };

  const toggleFocusMode = async () => {
    const newValue = !uiState.focusMode;
    
    if (newValue) {
      sessionStorage.setItem('scrollPos', window.scrollY.toString());
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = 'smooth';
      document.body.style.scrollBehavior = 'smooth';
      
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          updateState({ focusMode: newValue, fullscreen: true });
        } catch (err) {
          console.error('Failed to enter fullscreen:', err);
          updateState({ focusMode: newValue });
        }
      }
    } else {
      const savedPos = sessionStorage.getItem('scrollPos');
      if (savedPos) {
        window.scrollTo(0, parseInt(savedPos));
        sessionStorage.removeItem('scrollPos');
      }
      document.documentElement.style.scrollBehavior = '';
      document.body.style.scrollBehavior = '';
      
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
          updateState({ focusMode: newValue, fullscreen: false });
        } catch (err) {
          console.error('Failed to exit fullscreen:', err);
          updateState({ focusMode: newValue });
        }
      } else {
        updateState({ focusMode: newValue });
      }
    }
  };

  const toggleFullscreen = (element?: HTMLElement) => {
    if (!document.fullscreenElement && element) {
      element.requestFullscreen().then(() => {
        updateState({ fullscreen: true });
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        updateState({ fullscreen: false });
      });
    }
  };

  const setReadingMode = (value: boolean) => {
    updateState({ readingMode: value });
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (uiState.focusMode) {
        const savedPos = sessionStorage.getItem('scrollPos');
        if (savedPos) {
          window.scrollTo(0, parseInt(savedPos));
          sessionStorage.removeItem('scrollPos');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uiState.focusMode]);

  return (
    <UIStateContext.Provider value={{
      uiState,
      toggleFocusMode,
      toggleFullscreen,
      setReadingMode,
      startFocusSession: () => updateState({ isFocusSession: true }),
      endFocusSession: () => updateState({ isFocusSession: false })
    }}>
      {children}
    </UIStateContext.Provider>
  );
};