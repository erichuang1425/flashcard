/**
 * @jest-environment jsdom
 *
 * Tests for `SettingsContext`, which owns the theme toggle and the Pomodoro
 * timer. `useUserPreferences` and the notification-sound helpers are mocked, and
 * the timer is driven with Jest's fake clock so the countdown, manual controls
 * and work/break rollover can be asserted deterministically.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

const mockUpdatePreferences = jest.fn().mockResolvedValue(undefined);
let prefsValue: any;
jest.mock('../../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: prefsValue,
    updatePreferences: mockUpdatePreferences,
  }),
}));

const mockPlayCue = jest.fn();
const mockPrimeAudio = jest.fn();
jest.mock('../../utils/notification-sound', () => ({
  playNotificationCue: () => mockPlayCue(),
  primeNotificationAudio: () => mockPrimeAudio(),
}));

import { SettingsProvider, useSettings } from '../SettingsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

const renderSettings = () => renderHook(() => useSettings(), { wrapper });

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

describe('theme', () => {
  it('initialises from stored preferences', () => {
    const { result } = renderSettings();
    expect(result.current.theme).toBe('system');
  });

  it('cycles light → dark → system and persists each change', () => {
    const { result } = renderSettings();

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('system');

    expect(mockUpdatePreferences).toHaveBeenCalledTimes(3);
    expect(mockUpdatePreferences).toHaveBeenNthCalledWith(1, { theme: 'light' });
  });
});

describe('pomodoro timer', () => {
  it('derives the initial work duration from preferences', () => {
    const { result } = renderSettings();
    expect(result.current.pomodoro.timeLeft).toBe(60);
    expect(result.current.pomodoro.workDuration).toBe(60);
    expect(result.current.pomodoro.breakDuration).toBe(60);
    expect(result.current.pomodoro.isActive).toBe(false);
  });

  it('counts down once started and primes the audio context on the gesture', () => {
    const { result } = renderSettings();

    act(() => result.current.pomodoro.start());
    expect(result.current.pomodoro.isActive).toBe(true);
    expect(mockPrimeAudio).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.pomodoro.timeLeft).toBe(57);
  });

  it('pause stops the countdown', () => {
    const { result } = renderSettings();
    act(() => result.current.pomodoro.start());
    act(() => jest.advanceTimersByTime(2000));
    act(() => result.current.pomodoro.pause());

    const frozen = result.current.pomodoro.timeLeft;
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.pomodoro.isActive).toBe(false);
    expect(result.current.pomodoro.timeLeft).toBe(frozen);
  });

  it('reset restores the full work duration', () => {
    const { result } = renderSettings();
    act(() => result.current.pomodoro.start());
    act(() => jest.advanceTimersByTime(10000));
    act(() => result.current.pomodoro.reset());

    expect(result.current.pomodoro.isActive).toBe(false);
    expect(result.current.pomodoro.timeLeft).toBe(60);
  });

  it('rolls over into a break and chimes when the work block elapses', () => {
    const { result } = renderSettings();
    act(() => result.current.pomodoro.start());

    act(() => jest.advanceTimersByTime(60000));

    expect(result.current.pomodoro.isBreak).toBe(true);
    expect(result.current.pomodoro.timeLeft).toBe(60); // break duration
    expect(mockPlayCue).toHaveBeenCalled();
  });
});

it('throws when useSettings is used outside its provider', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useSettings())).toThrow(/within SettingsProvider/);
  errorSpy.mockRestore();
});
