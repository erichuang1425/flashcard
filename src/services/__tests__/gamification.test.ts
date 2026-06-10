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

  it('propagates errors from the Firestore read', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDoc.mockRejectedValue(new Error('offline'));
    await expect(updateUserXP('user-1', 10)).rejects.toThrow('offline');
    errorSpy.mockRestore();
  });
});
