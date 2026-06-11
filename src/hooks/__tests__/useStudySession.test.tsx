/**
 * @jest-environment jsdom
 *
 * Tests for `useStudySession`, the session engine every study mode feeds the
 * spaced-repetition scheduler through. Firestore and gamification services are
 * mocked so these tests focus on the engine's own behaviour: due-card
 * selection, graded scheduling (a wrong answer lapses the card), unified XP,
 * batch advancement, write-failure retry/queueing, and session completion.
 */
import '@testing-library/jest-dom';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Flashcard } from '../../types';

const mockGetUserFlashcards = jest.fn();
const mockUpdateCardReview = jest.fn();
const mockUpdateUserStudyStats = jest.fn();
const mockUpdateDailyStreak = jest.fn();
const mockUpdateUserXP = jest.fn();
const mockCheckAchievements = jest.fn();

jest.mock('../../services/firestore', () => ({
  getUserFlashcards: (...args: unknown[]) => mockGetUserFlashcards(...args),
  updateCardReview: (...args: unknown[]) => mockUpdateCardReview(...args),
  updateUserStudyStats: (...args: unknown[]) => mockUpdateUserStudyStats(...args),
  updateDailyStreak: (...args: unknown[]) => mockUpdateDailyStreak(...args),
}));

jest.mock('../../services/gamification', () => ({
  updateUserXP: (...args: unknown[]) => mockUpdateUserXP(...args),
}));

// The user object must be referentially stable across renders — the hook's
// load effect depends on it, and a fresh object every render would re-trigger
// loading forever.
const mockUser = { uid: 'u1' };
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => ({ checkAchievements: mockCheckAchievements }),
}));

import { useStudySession } from '../useStudySession';

const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

const makeCard = (over: Partial<Flashcard> & { id: string }): Flashcard => ({
  userId: 'u1',
  word: 'word',
  partOfSpeech: 'noun',
  englishDefinition: 'a definition',
  difficulty: 1,
  categories: [],
  created: new Date(0),
  nextReview: past,
  mastered: false,
  easeFactor: 2.5,
  interval: 10,
  repetitions: 3,
  ...over,
});

const dueA = makeCard({ id: 'a', word: 'alpha' });
const dueB = makeCard({ id: 'b', word: 'beta' });
const notDue = makeCard({ id: 'later', word: 'gamma', nextReview: future });

const renderSession = async (batchSize = 8) => {
  const rendered = renderHook(() => useStudySession(batchSize));
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserFlashcards.mockResolvedValue([dueA, dueB, notDue]);
  mockUpdateCardReview.mockResolvedValue(undefined);
  mockUpdateUserStudyStats.mockResolvedValue(undefined);
  mockUpdateDailyStreak.mockResolvedValue(undefined);
  mockUpdateUserXP.mockResolvedValue(undefined);
  mockCheckAchievements.mockResolvedValue(undefined);
});

it('loads the deck and queues only the due cards', async () => {
  const { result } = await renderSession();

  expect(result.current.deck).toHaveLength(3);
  expect(result.current.cards.map((c) => c.id)).toEqual(['a', 'b']);
  expect(result.current.currentCard?.id).toBe('a');
  expect(result.current.error).toBeNull();
});

it('lapses a card rated 1: interval resets instead of growing', async () => {
  const { result } = await renderSession();

  await act(async () => {
    await result.current.submitRating('a', 1);
  });

  expect(mockUpdateCardReview).toHaveBeenCalledWith(
    'u1',
    'a',
    expect.objectContaining({ interval: 0, repetitions: 0 })
  );
  expect(result.current.progress).toMatchObject({ incorrect: 1, correct: 0, streak: 0 });
  expect(result.current.currentCard?.id).toBe('b');
});

it('awards XP from one quality function and advances on a good answer', async () => {
  const { result } = await renderSession();

  await act(async () => {
    await result.current.submitRating('a', 3);
  });

  expect(mockUpdateUserXP).toHaveBeenCalledWith('u1', 5);
  expect(result.current.progress).toMatchObject({ correct: 1, streak: 1, cardsReviewed: 1 });
});

it('ignores a rating whose cardId does not match the current card', async () => {
  const { result } = await renderSession();

  await act(async () => {
    await result.current.submitRating('b', 4); // current card is 'a'
  });

  expect(mockUpdateCardReview).not.toHaveBeenCalled();
  expect(result.current.progress.cardsReviewed).toBe(0);
});

it('schedules every batch card individually and sums per-card XP', async () => {
  const { result } = await renderSession(2);

  await act(async () => {
    await result.current.submitBatch([
      { id: 'a', correct: true },
      { id: 'b', correct: false },
    ]);
  });

  // Correct → Good (interval grows), wrong → lapse (interval resets).
  expect(mockUpdateCardReview).toHaveBeenCalledWith(
    'u1',
    'a',
    expect.objectContaining({ repetitions: 4 })
  );
  expect(mockUpdateCardReview).toHaveBeenCalledWith(
    'u1',
    'b',
    expect.objectContaining({ interval: 0, repetitions: 0 })
  );
  // XP: 5 (Good) + 2 (lapse) through the same quality function as single cards.
  expect(mockUpdateUserXP).toHaveBeenCalledWith('u1', 7);
});

it('retries a failed review write once before queueing it and warning', async () => {
  mockUpdateCardReview
    .mockRejectedValueOnce(new Error('offline'))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(undefined);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { result } = await renderSession();

  await act(async () => {
    await result.current.submitRating('a', 3);
  });

  // Two attempts for the same card, then a non-blocking warning; the session
  // still advances.
  expect(mockUpdateCardReview).toHaveBeenCalledTimes(2);
  expect(result.current.saveWarning).toBe(true);
  expect(result.current.currentCard?.id).toBe('b');

  // Finishing the session flushes the queued review.
  await act(async () => {
    await result.current.submitRating('b', 3);
  });
  expect(result.current.isComplete).toBe(true);
  expect(mockUpdateCardReview).toHaveBeenCalledTimes(4); // b's write + the retried queue
  expect(mockUpdateCardReview).toHaveBeenLastCalledWith('u1', 'a', expect.anything());

  consoleError.mockRestore();
});

it('records stats, streak and achievements when the last card is rated', async () => {
  const { result } = await renderSession();

  await act(async () => {
    await result.current.submitRating('a', 4);
  });
  await act(async () => {
    await result.current.submitRating('b', 1);
  });

  expect(result.current.isComplete).toBe(true);
  expect(mockUpdateUserStudyStats).toHaveBeenCalledWith(
    'u1',
    expect.objectContaining({ cardsStudied: 2, accuracy: 50, masteredCards: 1 })
  );
  expect(mockUpdateDailyStreak).toHaveBeenCalledWith('u1');
  expect(mockCheckAchievements).toHaveBeenCalled();
});

it('surfaces a load failure as the translated error state', async () => {
  mockGetUserFlashcards.mockRejectedValue(new Error('offline'));
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { result } = await renderSession();

  expect(result.current.error).toBe('study.loadFailed');
  expect(result.current.cards).toHaveLength(0);

  consoleError.mockRestore();
});
