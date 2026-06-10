import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { playNotificationCue, primeNotificationAudio } from '../utils/notification-sound';

interface SettingsContextType {
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  pomodoro: {
    isActive: boolean;
    timeLeft: number;
    isBreak: boolean;
    /** Configured work/break durations in seconds (from user preferences). */
    workDuration: number;
    breakDuration: number;
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

  // Configured durations (in seconds), derived from user preferences so the
  // timer reset/rollover and the progress ring all use the same values.
  const workSeconds = (preferences?.pomodoroSettings?.workDuration ?? 25) * 60;
  const breakSeconds = (preferences?.pomodoroSettings?.breakDuration ?? 5) * 60;

  // Sync local state with stored user preferences
  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      const workDuration = preferences.pomodoroSettings?.workDuration ?? 25;
      setTimeLeft(workDuration * 60);
    }
  }, [preferences]);

  const toggleTheme = React.useCallback(() => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme }).catch(console.error);
  }, [theme, updatePreferences]);

  const startTimer = React.useCallback(() => {
    // Runs inside the Start button's click handler — a real user gesture — so
    // resume the audio context now; iOS won't let the later, timer-driven cue
    // play otherwise.
    primeNotificationAudio();
    setIsActive(true);
  }, []);
  const pauseTimer = React.useCallback(() => setIsActive(false), []);
  const resetTimer = React.useCallback(() => {
    setIsActive(false);
    setTimeLeft(isBreak ? breakSeconds : workSeconds);
  }, [isBreak, breakSeconds, workSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsBreak(prev => !prev);
      // Switching out of a break starts the next work block, and vice versa.
      setTimeLeft(isBreak ? workSeconds : breakSeconds);
      // Signal the interval change with a synthesized chime + vibration
      // fallback (no audio asset to load; see notification-sound.ts).
      playNotificationCue();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, workSeconds, breakSeconds]);

  const value = React.useMemo(() => ({
    theme,
    toggleTheme,
    pomodoro: {
      isActive,
      timeLeft,
      isBreak,
      workDuration: workSeconds,
      breakDuration: breakSeconds,
      start: startTimer,
      pause: pauseTimer,
      reset: resetTimer
    }
  }), [theme, toggleTheme, isActive, timeLeft, isBreak, workSeconds, breakSeconds, startTimer, pauseTimer, resetTimer]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
