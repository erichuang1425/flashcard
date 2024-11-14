import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface FocusModeContextType {
  focusMode: boolean;
  toggleFocusMode: () => void;
  isFocusSession: boolean;
}

const FocusModeContext = createContext<FocusModeContextType | null>(null);

export const useFocusMode = () => {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error('useFocusMode must be used within a FocusModeProvider');
  }
  return context;
};

export const FocusModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focusMode, setFocusMode] = useState(false);
  const [isFocusSession, setIsFocusSession] = useState(false);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const newValue = !prev;
      if (newValue) {
        // Save current window scroll position
        sessionStorage.setItem('scrollPos', window.scrollY.toString());
        window.scrollTo(0, 0);
      }
      return newValue;
    });
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    // Clean up scroll position when leaving focus mode
    if (!focusMode) {
      const savedPos = sessionStorage.getItem('scrollPos');
      if (savedPos) {
        window.scrollTo(0, parseInt(savedPos));
        sessionStorage.removeItem('scrollPos');
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [focusMode, toggleFocusMode]);

  return (
    <FocusModeContext.Provider value={{ focusMode, toggleFocusMode, isFocusSession }}>
      {children}
    </FocusModeContext.Provider>
  );
};