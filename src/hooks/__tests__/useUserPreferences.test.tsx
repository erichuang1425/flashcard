/**
 * @jest-environment jsdom
 *
 * Tests for the `useUserPreferences` hook, which loads (and lazily seeds) the
 * signed-in user's study preferences from Firestore. The Firestore SDK and the
 * auth context are mocked so the hook's own branching — no user, existing doc,
 * first-run defaulting, the error path and persisted updates — is exercised
 * without a real backend.
 */
import '@testing-library/jest-dom';
import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('../../services/firebase', () => ({ db: {} }));

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ __ref: true })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useUserPreferences } from '../useUserPreferences';

const USER = { uid: 'alice' };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: USER });
  mockSetDoc.mockResolvedValue(undefined);
});

it('stops loading without fetching when there is no signed-in user', async () => {
  mockUseAuth.mockReturnValue({ user: null });

  const { result } = renderHook(() => useUserPreferences());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.preferences).toBeNull();
  expect(mockGetDoc).not.toHaveBeenCalled();
});

it('loads the stored preferences document when it exists', async () => {
  const stored = { theme: 'dark', dailyGoal: 99 };
  mockGetDoc.mockResolvedValue({ exists: () => true, data: () => stored });

  const { result } = renderHook(() => useUserPreferences());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.preferences).toEqual(stored);
  // Existing doc → no write.
  expect(mockSetDoc).not.toHaveBeenCalled();
});

it('seeds and persists sensible defaults on first run', async () => {
  mockGetDoc.mockResolvedValue({ exists: () => false });

  const { result } = renderHook(() => useUserPreferences());

  await waitFor(() => expect(result.current.preferences).not.toBeNull());
  expect(result.current.preferences).toMatchObject({
    theme: 'system',
    studySessionLength: 20,
    dailyGoal: 30,
    language: 'en',
    onboardingCompleted: false,
    pomodoroSettings: { workDuration: 25, breakDuration: 5 },
  });
  // The freshly built defaults are written back so later sessions read them.
  expect(mockSetDoc).toHaveBeenCalledTimes(1);
  expect(mockSetDoc.mock.calls[0][1]).toEqual(result.current.preferences);
});

it('surfaces a load failure through the error field', async () => {
  mockGetDoc.mockRejectedValue(new Error('offline'));

  const { result } = renderHook(() => useUserPreferences());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toEqual(new Error('offline'));
  expect(result.current.preferences).toBeNull();
});

describe('updatePreferences', () => {
  it('merges the patch over the current preferences and persists it', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ theme: 'light', dailyGoal: 30 }),
    });

    const { result } = renderHook(() => useUserPreferences());
    await waitFor(() => expect(result.current.preferences).not.toBeNull());

    await act(async () => {
      await result.current.updatePreferences({ theme: 'dark' });
    });

    expect(result.current.preferences).toEqual({ theme: 'dark', dailyGoal: 30 });
    // Last write carries the merged object.
    expect(mockSetDoc).toHaveBeenLastCalledWith(expect.anything(), {
      theme: 'dark',
      dailyGoal: 30,
    });
  });

  it('does nothing before preferences have loaded', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserPreferences());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({ theme: 'dark' });
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('records the error and rethrows when the write fails', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ theme: 'light' }) });
    const { result } = renderHook(() => useUserPreferences());
    await waitFor(() => expect(result.current.preferences).not.toBeNull());

    mockSetDoc.mockRejectedValueOnce(new Error('write failed'));

    await act(async () => {
      await expect(result.current.updatePreferences({ theme: 'dark' })).rejects.toThrow(
        'write failed',
      );
    });
    expect(result.current.error).toEqual(new Error('write failed'));
  });
});
