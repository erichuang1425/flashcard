/**
 * @jest-environment jsdom
 *
 * Tests for `PomodoroContext`, the focus timer extracted from `SettingsContext`
 * in Phase 4. `useSettings` (for the configured durations) and the
 * notification-sound helpers are mocked, and the timer is driven with Jest's
 * fake clock so the countdown, manual controls and work/break rollover can be
 * asserted deterministically.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

let prefsValue: any;
jest.mock('../SettingsContext', () => ({
  useSettings: () => ({ preferences: prefsValue }),
}));

const mockPlayCue = jest.fn();
const mockPrimeAudio = jest.fn();
jest.mock('../../utils/notification-sound', () => ({
  playNotificationCue: () => mockPlayCue(),
  primeNotificationAudio: () => mockPrimeAudio(),
}));

import { PomodoroProvider, usePomodoro } from '../PomodoroContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PomodoroProvider>{children}</PomodoroProvider>
);

const renderPomodoro = () => renderHook(() => usePomodoro(), { wrapper });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // 1-minute work / 1-minute break keeps the rollover test to 60 ticks.
  prefsValue = {
    theme: 'system',
    pomodoroSettings: { workDuration: 1, breakDuration: 1 },
  };
});

afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

it('derives the initial work duration from preferences', () => {
  const { result } = renderPomodoro();
  expect(result.current.timeLeft).toBe(60);
  expect(result.current.workDuration).toBe(60);
  expect(result.current.breakDuration).toBe(60);
  expect(result.current.isActive).toBe(false);
});

it('counts down once started and primes the audio context on the gesture', () => {
  const { result } = renderPomodoro();

  act(() => result.current.start());
  expect(result.current.isActive).toBe(true);
  expect(mockPrimeAudio).toHaveBeenCalledTimes(1);

  act(() => jest.advanceTimersByTime(3000));
  expect(result.current.timeLeft).toBe(57);
});

it('pause stops the countdown', () => {
  const { result } = renderPomodoro();
  act(() => result.current.start());
  act(() => jest.advanceTimersByTime(2000));
  act(() => result.current.pause());

  const frozen = result.current.timeLeft;
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.isActive).toBe(false);
  expect(result.current.timeLeft).toBe(frozen);
});

it('reset restores the full work duration', () => {
  const { result } = renderPomodoro();
  act(() => result.current.start());
  act(() => jest.advanceTimersByTime(10000));
  act(() => result.current.reset());

  expect(result.current.isActive).toBe(false);
  expect(result.current.timeLeft).toBe(60);
});

it('rolls over into a break and chimes when the work block elapses', () => {
  const { result } = renderPomodoro();
  act(() => result.current.start());

  act(() => jest.advanceTimersByTime(60000));

  expect(result.current.isBreak).toBe(true);
  expect(result.current.timeLeft).toBe(60); // break duration
  expect(mockPlayCue).toHaveBeenCalled();
});

it('keeps a running timer intact when an unrelated preference is saved', () => {
  const { result, rerender } = renderPomodoro();
  act(() => result.current.start());
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.timeLeft).toBe(55);

  // Saving an unrelated setting replaces the shared preferences object but
  // leaves the durations unchanged; the running countdown must survive it.
  prefsValue = { ...prefsValue, dailyGoal: 99 };
  rerender();

  expect(result.current.isActive).toBe(true);
  expect(result.current.timeLeft).toBe(55);
});

it('does not reset an active timer when the work duration changes', () => {
  const { result, rerender } = renderPomodoro();
  act(() => result.current.start());
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.timeLeft).toBe(55);

  // A new work duration applies on the next reset/rollover, not by yanking the
  // current block back to full.
  prefsValue = { ...prefsValue, pomodoroSettings: { workDuration: 2, breakDuration: 1 } };
  rerender();

  expect(result.current.timeLeft).toBe(55);
  expect(result.current.workDuration).toBe(120);
});

it('throws when usePomodoro is used outside its provider', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => usePomodoro())).toThrow(/within a PomodoroProvider/);
  errorSpy.mockRestore();
});
