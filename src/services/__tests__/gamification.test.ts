// The gamification service imports `../firebase`, which reads Vite's
// `import.meta.env` at module load — that doesn't exist under ts-jest's
// CommonJS target. Mocking `../firebase` (and the Firestore SDK it leans on)
// keeps that initialization out of the test while still exercising the real
// leveling logic.
jest.mock('../firebase', () => ({ db: {} }));

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
// updateUserXP runs inside a transaction; route the transaction's get/set
// through the same mocks so the assertions below stay shape-compatible.
const mockRunTransaction = jest.fn(
  async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: (ref: unknown) => mockGetDoc(ref),
      set: (ref: unknown, data: unknown, options: unknown) => mockSetDoc(ref, data, options),
    })
);

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  Timestamp: {},
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...(args as [unknown, (tx: unknown) => Promise<unknown>])),
}));

import {
  getRequiredXP,
  initialLevelSystem,
  applyXPGain,
  updateUserXP,
  challengeDateKey,
  generateDailyChallenges,
  applyChallengeEvent,
  ensureDailyChallenges,
  recordChallengeProgress,
} from '../gamification';
import type { LevelSystem } from '../../types/gamification';

describe('getRequiredXP', () => {
  it('returns the base XP for level 1', () => {
    // BASE_XP * GROWTH_FACTOR^(1-1) = 100 * 1
    expect(getRequiredXP(1)).toBe(100);
  });

  it('grows geometrically by the 1.5 factor each level', () => {
    expect(getRequiredXP(2)).toBe(150); // 100 * 1.5
    expect(getRequiredXP(3)).toBe(225); // 100 * 1.5^2
    expect(getRequiredXP(4)).toBe(337); // floor(100 * 1.5^3 = 337.5)
  });

  it('floors fractional requirements', () => {
    expect(Number.isInteger(getRequiredXP(4))).toBe(true);
  });
});

describe('initialLevelSystem', () => {
  it('starts a fresh player at level 1 with no XP', () => {
    expect(initialLevelSystem()).toEqual({
      currentLevel: 1,
      currentXP: 0,
      requiredXP: 100,
      totalXP: 0,
    });
  });

  it('returns a new object each call (no shared mutable state)', () => {
    expect(initialLevelSystem()).not.toBe(initialLevelSystem());
  });
});

describe('applyXPGain', () => {
  const fresh = (): LevelSystem => initialLevelSystem();

  it('accumulates XP without leveling up below the threshold', () => {
    const result = applyXPGain(fresh(), 40);
    expect(result).toEqual({
      currentLevel: 1,
      currentXP: 40,
      requiredXP: 100,
      totalXP: 40,
    });
  });

  it('levels up and carries the remainder forward', () => {
    // 120 XP: clears level 1 (needs 100), 20 rolls over toward level 2.
    const result = applyXPGain(fresh(), 120);
    expect(result.currentLevel).toBe(2);
    expect(result.currentXP).toBe(20);
    expect(result.requiredXP).toBe(getRequiredXP(2));
    expect(result.totalXP).toBe(120);
  });

  it('rolls up through several levels on one large award', () => {
    // 100 (L1) + 150 (L2) + 225 (L3) = 475 to reach level 4 exactly.
    const result = applyXPGain(fresh(), 475);
    expect(result.currentLevel).toBe(4);
    expect(result.currentXP).toBe(0);
    expect(result.requiredXP).toBe(getRequiredXP(4));
    expect(result.totalXP).toBe(475);
  });

  it('levels up when XP lands exactly on the requirement', () => {
    const result = applyXPGain(fresh(), 100);
    expect(result.currentLevel).toBe(2);
    expect(result.currentXP).toBe(0);
  });

  it('keeps a running totalXP across repeated gains', () => {
    const afterFirst = applyXPGain(fresh(), 60);
    const afterSecond = applyXPGain(afterFirst, 60);
    // 120 total crosses level 1's 100 threshold, 20 carries over.
    expect(afterSecond.totalXP).toBe(120);
    expect(afterSecond.currentLevel).toBe(2);
    expect(afterSecond.currentXP).toBe(20);
  });

  it('does not mutate the input stats', () => {
    const input = fresh();
    applyXPGain(input, 500);
    expect(input).toEqual(initialLevelSystem());
  });
});

describe('updateUserXP', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('initializes default stats and writes the result when no doc exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await updateUserXP('user-1', 120);

    expect(result.currentLevel).toBe(2);
    expect(result.currentXP).toBe(20);
    expect(result.totalXP).toBe(120);
    // Persisted with merge so unrelated fields aren't clobbered.
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
    expect(mockSetDoc.mock.calls[0][1]).toEqual(result);
  });

  it('builds on the existing stats document when present', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        currentLevel: 2,
        currentXP: 90,
        requiredXP: 150,
        totalXP: 190,
      }),
    });

    const result = await updateUserXP('user-1', 60);

    // 90 + 60 = 150 clears level 2's 150 requirement exactly → level 3, 0 carry.
    expect(result.currentLevel).toBe(3);
    expect(result.currentXP).toBe(0);
    expect(result.totalXP).toBe(250);
  });

  it('treats a stats doc that holds only challenge data as a fresh level system', async () => {
    // A new account whose first write to this doc was the daily-challenge data:
    // it exists but has no level fields. Casting it straight to LevelSystem
    // would feed applyXPGain undefined fields and produce NaN.
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ challengesDate: '2026-06-20', dailyChallenges: [] }),
    });

    const result = await updateUserXP('user-1', 50);

    expect(result).toEqual({ currentLevel: 1, currentXP: 50, requiredXP: 100, totalXP: 50 });
  });

  it('propagates errors from the Firestore read', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDoc.mockRejectedValue(new Error('offline'));
    await expect(updateUserXP('user-1', 10)).rejects.toThrow('offline');
    errorSpy.mockRestore();
  });
});

describe('generateDailyChallenges', () => {
  it('returns three challenges, one of each type', () => {
    const challenges = generateDailyChallenges('2026-06-20');
    expect(challenges).toHaveLength(3);
    expect(challenges.map((c) => c.type).sort()).toEqual([
      'accuracy',
      'cards_reviewed',
      'study_time',
    ]);
    expect(challenges.every((c) => c.progress === 0 && !c.completed)).toBe(true);
  });

  it('is deterministic for a given day but varies across days', () => {
    expect(generateDailyChallenges('2026-06-20')).toEqual(generateDailyChallenges('2026-06-20'));
    // Different days can pick different targets out of the pool.
    const a = generateDailyChallenges('2026-06-20').map((c) => c.id).join();
    const b = generateDailyChallenges('2026-06-21').map((c) => c.id).join();
    expect(a).not.toBe(b);
  });
});

describe('applyChallengeEvent', () => {
  const challenges = [
    { id: 'review-20', type: 'cards_reviewed' as const, target: 20, progress: 0, reward: 30, completed: false },
    { id: 'study-20', type: 'study_time' as const, target: 20, progress: 0, reward: 60, completed: false },
    { id: 'accuracy-90', type: 'accuracy' as const, target: 90, progress: 0, reward: 60, completed: false },
  ];

  it('accumulates count and time progress, capped at the target', () => {
    const after = applyChallengeEvent(challenges, { cardsReviewed: 25, accuracy: 0, studyMinutes: 5 });
    expect(after[0]).toMatchObject({ progress: 20, completed: true }); // capped at 20
    expect(after[1]).toMatchObject({ progress: 5, completed: false });
  });

  it('records the best session accuracy, only for non-empty sessions', () => {
    const afterEmpty = applyChallengeEvent(challenges, { cardsReviewed: 0, accuracy: 100, studyMinutes: 0 });
    expect(afterEmpty[2].progress).toBe(0); // a zero-card session can't bank accuracy

    const afterGood = applyChallengeEvent(challenges, { cardsReviewed: 10, accuracy: 95, studyMinutes: 1 });
    expect(afterGood[2]).toMatchObject({ progress: 95, completed: true });
  });

  it('never regresses an already-completed challenge', () => {
    const done = [{ ...challenges[0], progress: 20, completed: true }];
    const after = applyChallengeEvent(done, { cardsReviewed: 0, accuracy: 0, studyMinutes: 0 });
    expect(after[0]).toEqual(done[0]);
  });

  it('does not mutate the input', () => {
    const snapshot = JSON.stringify(challenges);
    applyChallengeEvent(challenges, { cardsReviewed: 50, accuracy: 100, studyMinutes: 50 });
    expect(JSON.stringify(challenges)).toBe(snapshot);
  });
});

describe('ensureDailyChallenges', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('generates and persists a fresh set, seeding the level system, on a new doc', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await ensureDailyChallenges('u1', new Date('2026-06-20T12:00:00Z'), 'UTC');

    expect(result).toEqual(generateDailyChallenges('2026-06-20'));
    // The single write carries both the challenges and an initial level system,
    // so the snapshot listener never sees a level-less doc.
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      challengesDate: '2026-06-20',
      dailyChallenges: result,
      ...initialLevelSystem(),
    });
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
  });

  it('returns the stored set without overwriting it when today is already initialized', async () => {
    const dateKey = challengeDateKey(new Date('2026-06-20T12:00:00Z'), 'UTC');
    const stored = applyChallengeEvent(generateDailyChallenges(dateKey), {
      cardsReviewed: 5,
      accuracy: 0,
      studyMinutes: 0,
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ challengesDate: dateKey, dailyChallenges: stored, ...initialLevelSystem() }),
    });

    const result = await ensureDailyChallenges('u1', new Date('2026-06-20T12:00:00Z'), 'UTC');

    expect(result).toEqual(stored);
    expect(mockSetDoc).not.toHaveBeenCalled(); // progress preserved, no clobber
  });

  it('does not overwrite existing level fields when seeding a new day', async () => {
    // Yesterday's doc carries a real level system but stale challenges.
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        challengesDate: '2026-06-19',
        dailyChallenges: [],
        currentLevel: 3,
        currentXP: 10,
        requiredXP: 225,
        totalXP: 400,
      }),
    });

    await ensureDailyChallenges('u1', new Date('2026-06-20T12:00:00Z'), 'UTC');

    // A new set is written, but no level fields are included (so the real ones
    // survive the merge).
    const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(written.challengesDate).toBe('2026-06-20');
    expect(written).not.toHaveProperty('currentLevel');
  });
});

describe('recordChallengeProgress', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('generates a set when none is stored, persists progress, and pays the reward atomically', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await recordChallengeProgress('u1', {
      cardsReviewed: 100,
      accuracy: 100,
      studyMinutes: 100,
    });

    // A big session clears every challenge in the generated trio.
    expect(result.every((c) => c.completed)).toBe(true);

    // One single write carries the progressed challenges AND the rewarded level
    // system — completion and payout commit together.
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(written).toMatchObject({ dailyChallenges: result });
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
    // Reward XP equals the sum of the completed challenges' rewards, applied to
    // a fresh level system (totalXP started at 0).
    const expectedReward = result.reduce((sum, c) => sum + c.reward, 0);
    expect(written.totalXP).toBe(expectedReward);
  });

  it('does not award XP when no challenge is newly completed', async () => {
    const dateKey = challengeDateKey();
    const stored = generateDailyChallenges(dateKey);
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        challengesDate: dateKey,
        dailyChallenges: stored,
        currentLevel: 2,
        currentXP: 40,
        requiredXP: 150,
        totalXP: 190,
      }),
    });

    await recordChallengeProgress('u1', { cardsReviewed: 1, accuracy: 50, studyMinutes: 0 });

    // The level system is written back unchanged — no reward applied.
    const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(written).toMatchObject({ currentLevel: 2, currentXP: 40, totalXP: 190 });
  });
});
