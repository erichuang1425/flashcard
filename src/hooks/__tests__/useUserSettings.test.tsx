/**
 * @jest-environment jsdom
 *
 * Tests for `useUserSettings`, the thin editing layer over
 * `useUserPreferences`. It is mocked here so these tests focus on this hook's
 * own behaviour: forwarding single-field and pomodoro patches, tracking the
 * dirty flag, the save round-trip, and the no-op guards when nothing has loaded.
 */
import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';

const mockUpdatePreferences = jest.fn();
let prefsHookValue: {
  preferences: any;
  updatePreferences: typeof mockUpdatePreferences;
  loading: boolean;
  error: Error | null;
};

jest.mock('../useUserPreferences', () => ({
  useUserPreferences: () => prefsHookValue,
}));

import { useUserSettings } from '../useUserSettings';

const basePrefs = {
  theme: 'light',
  pomodoroSettings: { workDuration: 25, breakDuration: 5, longBreakDuration: 15, sessionsUntilLongBreak: 4 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdatePreferences.mockResolvedValue(undefined);
  prefsHookValue = {
    preferences: { ...basePrefs },
    updatePreferences: mockUpdatePreferences,
    loading: false,
    error: null,
  };
});

it('exposes the underlying preferences as `settings`', () => {
  const { result } = renderHook(() => useUserSettings());
  expect(result.current.settings).toEqual(basePrefs);
  expect(result.current.isDirty).toBe(false);
});

it('forwards a single setting change and marks the form dirty', async () => {
  const { result } = renderHook(() => useUserSettings());

  await act(async () => {
    await (result.current.updateSetting as any)('theme', 'dark');
  });

  expect(mockUpdatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
  expect(result.current.isDirty).toBe(true);
});

it('merges a partial pomodoro patch over the existing pomodoro settings', async () => {
  const { result } = renderHook(() => useUserSettings());

  await act(async () => {
    await result.current.updatePomodoroSettings({ workDuration: 50 });
  });

  expect(mockUpdatePreferences).toHaveBeenCalledWith({
    pomodoroSettings: {
      workDuration: 50,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
    },
  });
  expect(result.current.isDirty).toBe(true);
});

it('saveChanges only writes once dirty, then clears the dirty flag', async () => {
  const { result } = renderHook(() => useUserSettings());

  // Not dirty yet → save is a no-op.
  await act(async () => {
    await result.current.saveChanges();
  });
  expect(mockUpdatePreferences).not.toHaveBeenCalled();

  await act(async () => {
    await (result.current.updateSetting as any)('theme', 'dark');
  });
  expect(result.current.isDirty).toBe(true);

  await act(async () => {
    await result.current.saveChanges();
  });
  // Once for the edit, once for the explicit save.
  expect(mockUpdatePreferences).toHaveBeenCalledTimes(2);
  expect(mockUpdatePreferences).toHaveBeenLastCalledWith(basePrefs);
  expect(result.current.isDirty).toBe(false);
});

it('guards every mutation when preferences have not loaded', async () => {
  prefsHookValue = {
    preferences: null,
    updatePreferences: mockUpdatePreferences,
    loading: true,
    error: null,
  };
  const { result } = renderHook(() => useUserSettings());

  await act(async () => {
    await (result.current.updateSetting as any)('theme', 'dark');
    await result.current.updatePomodoroSettings({ workDuration: 50 });
    await result.current.saveChanges();
  });

  expect(mockUpdatePreferences).not.toHaveBeenCalled();
  expect(result.current.isDirty).toBe(false);
});

it('rethrows when the underlying update fails', async () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockUpdatePreferences.mockRejectedValueOnce(new Error('nope'));
  const { result } = renderHook(() => useUserSettings());

  await act(async () => {
    await expect((result.current.updateSetting as any)('theme', 'dark')).rejects.toThrow('nope');
  });
  // A failed edit must not leave the form looking saved.
  expect(result.current.isDirty).toBe(false);
  errorSpy.mockRestore();
});
