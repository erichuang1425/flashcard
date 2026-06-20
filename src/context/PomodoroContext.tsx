import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import { playNotificationCue, primeNotificationAudio } from '../utils/notification-sound';

/**
 * The Pomodoro focus timer. Extracted from `SettingsContext` in Phase 4 so the
 * timer's transient state (countdown, work/break rollover, chime) is owned by a
 * single, focused provider mounted only around the authenticated app shell that
 * renders it — rather than living alongside theme/preferences for the whole
 * tree. The configured durations are still read from user preferences via
 * `useSettings`, keeping preferences a single source of truth.
 */
interface PomodoroContextType {
  isActive: boolean;
  timeLeft: number;
  isBreak: boolean;
  /** Configured work/break durations in seconds (from user preferences). */
  workDuration: number;
  breakDuration: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences } = useSettings();
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isBreak, setIsBreak] = useState(false);

  // Configured durations (in seconds), derived from user preferences so the
  // timer reset/rollover and the progress ring all use the same values.
  const workSeconds = (preferences?.pomodoroSettings?.workDuration ?? 25) * 60;
  const breakSeconds = (preferences?.pomodoroSettings?.breakDuration ?? 5) * 60;

  // Keep the idle countdown in sync with the configured durations. This depends
  // narrowly on the derived second-counts — not the whole preferences object —
  // so saving unrelated settings (dailyGoal, notifications, …) doesn't re-run
  // it, and it never touches a running timer, so a save can't discard Pomodoro
  // progress. A changed duration takes effect on the next idle tick / reset.
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(isBreak ? breakSeconds : workSeconds);
    }
    // isActive/isBreak are read for the guard but intentionally not deps: this
    // should fire only when the configured durations change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workSeconds, breakSeconds]);

  const start = React.useCallback(() => {
    // Runs inside the Start button's click handler — a real user gesture — so
    // resume the audio context now; iOS won't let the later, timer-driven cue
    // play otherwise.
    primeNotificationAudio();
    setIsActive(true);
  }, []);
  const pause = React.useCallback(() => setIsActive(false), []);
  const reset = React.useCallback(() => {
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
    isActive,
    timeLeft,
    isBreak,
    workDuration: workSeconds,
    breakDuration: breakSeconds,
    start,
    pause,
    reset,
  }), [isActive, timeLeft, isBreak, workSeconds, breakSeconds, start, pause, reset]);

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = (): PomodoroContextType => {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error('usePomodoro must be used within a PomodoroProvider');
  return context;
};
