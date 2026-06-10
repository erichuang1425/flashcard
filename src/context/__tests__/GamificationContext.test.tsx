/**
 * @jest-environment jsdom
 *
 * Tests for `GamificationContext`. The auth context, gamification services and
 * the Firestore SDK are mocked so the provider's orchestration is exercised:
 * subscribing to the level-system document, loading achievements, awarding XP
 * (and the follow-on achievement check), and the focus-mode body-filter effect.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act, waitFor, screen } from '@testing-library/react';
import type { LevelSystem } from '../../types/gamification';

let mockUser: { uid: string } | null = { uid: 'alice' };
jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockUpdateUserXP = jest.fn();
const mockLoadAchievements = jest.fn();
const mockCheckAchievements = jest.fn();
jest.mock('../../services/gamification', () => ({
  getRequiredXP: jest.fn(() => 100),
  updateUserXP: (...args: unknown[]) => mockUpdateUserXP(...args),
  loadUserAchievements: (...args: unknown[]) => mockLoadAchievements(...args),
  checkAndUpdateAchievements: (...args: unknown[]) => mockCheckAchievements(...args),
}));

const mockGetUserStudyStats = jest.fn();
jest.mock('../../services/firestore', () => ({
  getUserStudyStats: (...args: unknown[]) => mockGetUserStudyStats(...args),
}));

jest.mock('../../services/firebase', () => ({ db: {} }));

const mockOnSnapshot = jest.fn();
jest.mock('@firebase/firestore', () => ({
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  doc: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(),
}));

import { GamificationProvider, useGamification } from '../GamificationContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GamificationProvider>{children}</GamificationProvider>
);
const renderGamification = () => renderHook(() => useGamification(), { wrapper });

// Emit a Firestore snapshot to the latest onSnapshot subscriber.
const emitSnapshot = (data: LevelSystem | null) => {
  const cb = mockOnSnapshot.mock.calls.at(-1)![1] as (snap: unknown) => void;
  act(() => cb({ exists: () => data !== null, data: () => data }));
};

const aLevel = (currentLevel: number): LevelSystem => ({
  currentLevel,
  currentXP: 0,
  requiredXP: 100,
  totalXP: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { uid: 'alice' };
  mockOnSnapshot.mockReturnValue(() => {}); // unsubscribe fn
  mockLoadAchievements.mockResolvedValue([]);
  mockCheckAchievements.mockResolvedValue(undefined);
  mockGetUserStudyStats.mockResolvedValue({
    totalStudySessions: 4,
    masteredCards: 7,
    totalStudyMinutes: 30,
    studyMinutes: 30,
    averageAccuracy: 80,
  });
  document.body.style.filter = '';
});

it('subscribes to the level-system document and reflects snapshots', async () => {
  const { result } = renderGamification();
  expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

  emitSnapshot(aLevel(2));
  expect(result.current.levelSystem).toEqual(aLevel(2));
  // Let the mount-time achievement load settle inside act().
  await act(async () => {});
});

it('loads the user achievements on mount', async () => {
  const achievements = [{ id: 'first-card' }] as any;
  mockLoadAchievements.mockResolvedValue(achievements);

  const { result } = renderGamification();

  await waitFor(() => expect(result.current.achievements).toEqual(achievements));
  expect(mockLoadAchievements).toHaveBeenCalledWith('alice');
});

it('does not subscribe when there is no signed-in user', () => {
  mockUser = null;
  renderGamification();
  expect(mockOnSnapshot).not.toHaveBeenCalled();
});

describe('addXP', () => {
  it('awards XP, updates the level system and re-checks achievements', async () => {
    mockUpdateUserXP.mockResolvedValue(aLevel(3));
    const { result } = renderGamification();

    await act(async () => {
      await result.current.addXP(50);
    });

    expect(mockUpdateUserXP).toHaveBeenCalledWith('alice', 50);
    expect(result.current.levelSystem).toEqual(aLevel(3));
    expect(mockCheckAchievements).toHaveBeenCalledTimes(1);
    // The achievement check runs against real study stats, not the XP totals.
    expect(mockGetUserStudyStats).toHaveBeenCalledWith('alice');
    expect(mockCheckAchievements).toHaveBeenCalledWith('alice', {
      studySessions: 4,
      cardsMastered: 7,
      studyTime: 30,
      averageAccuracy: 80,
      perfectSessions: 0,
    });
    // Achievements are reloaded after the check: once on mount, once here.
    expect(mockLoadAchievements).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without a signed-in user', async () => {
    mockUser = null;
    const { result } = renderGamification();

    await act(async () => {
      await result.current.addXP(50);
    });

    expect(mockUpdateUserXP).not.toHaveBeenCalled();
  });
});

describe('level-up notification', () => {
  it('does not fire on the first snapshot, even at a high level', async () => {
    renderGamification();
    emitSnapshot(aLevel(5));
    expect(screen.queryByText(/level up/i)).not.toBeInTheDocument();
    await act(async () => {});
  });

  it('fires when a later snapshot raises the level', async () => {
    renderGamification();
    emitSnapshot(aLevel(2));
    emitSnapshot(aLevel(3));
    expect(screen.getByText(/reached level 3/i)).toBeInTheDocument();
    await act(async () => {});
  });
});

describe('focus mode', () => {
  it('defaults to off and applies a grayscale filter when enabled', async () => {
    const { result } = renderGamification();
    expect(result.current.focusMode).toBe(false);
    expect(document.body.style.filter).toBe('none');

    act(() => result.current.setFocusMode(true));

    expect(result.current.focusMode).toBe(true);
    expect(document.body.style.filter).toBe('grayscale(0.5)');
    await act(async () => {}); // flush the mount-time achievement load
  });

  it('clears the filter again when disabled', async () => {
    const { result } = renderGamification();
    act(() => result.current.setFocusMode(true));
    act(() => result.current.setFocusMode(false));
    expect(document.body.style.filter).toBe('none');
    await act(async () => {});
  });
});

it('throws when useGamification is used outside its provider', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useGamification())).toThrow(/within a GamificationProvider/);
  errorSpy.mockRestore();
});
