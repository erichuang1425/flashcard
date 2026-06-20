/**
 * @jest-environment jsdom
 *
 * Tests for `SettingsContext`, the single preferences reader/writer for the
 * authenticated app. It owns the theme toggle and re-exposes the shared
 * preferences read/write path; `useUserPreferences` is mocked so the theme
 * cycle and persistence can be asserted without Firestore. (The Pomodoro timer
 * moved to `PomodoroContext`; see its own suite.)
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

const mockUpdatePreferences = jest.fn().mockResolvedValue(undefined);
let prefsValue: any;
jest.mock('../../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: prefsValue,
    loading: false,
    updatePreferences: mockUpdatePreferences,
  }),
}));

import { SettingsProvider, useSettings } from '../SettingsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

const renderSettings = () => renderHook(() => useSettings(), { wrapper });

beforeEach(() => {
  jest.clearAllMocks();
  prefsValue = {
    theme: 'system',
    pomodoroSettings: { workDuration: 1, breakDuration: 1 },
  };
});

describe('preferences', () => {
  it('exposes the shared preferences and updater', () => {
    const { result } = renderSettings();
    expect(result.current.preferences).toBe(prefsValue);
    expect(result.current.updatePreferences).toBe(mockUpdatePreferences);
  });
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

it('throws when useSettings is used outside its provider', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useSettings())).toThrow(/within SettingsProvider/);
  errorSpy.mockRestore();
});
