import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { playNotificationCue } from '../utils/notification-sound';

interface SettingsContextType {
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  pomodoro: {
    isActive: boolean;
    timeLeft: number;
    isBreak: boolean;
    start: () => void;
    pause: () => void;
    reset: () => void;
  };
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, updatePreferences } = useUserPreferences();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isBreak, setIsBreak] = useState(false);

  // Sync local state with stored user preferences
  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      const workDuration = preferences.pomodoroSettings?.workDuration ?? 25;
      setTimeLeft(workDuration * 60);
    }
  }, [preferences]);

  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme }).catch(console.error);
  };

  const startTimer = () => setIsActive(true);
  const pauseTimer = () => setIsActive(false);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsBreak(prev => !prev);
      setTimeLeft(isBreak ? 25 * 60 : 5 * 60);
      // Signal the interval change with a synthesized chime + vibration
      // fallback (no audio asset to load; see notification-sound.ts).
      playNotificationCue();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak]);

  return (
    <SettingsContext.Provider value={{
      theme,
      toggleTheme,
      pomodoro: {
        isActive,
        timeLeft,
        isBreak,
        start: startTimer,
        pause: pauseTimer,
        reset: resetTimer
      }
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
