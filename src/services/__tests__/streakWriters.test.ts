/**
 * Unit coverage for the streak writer interaction. `finishSession` calls
 * `updateUserStudyStats` and then `updateDailyStreak`, and the streak only
 * advances correctly if the first writer leaves `lastStudyDate` at the prior
 * day for the second to read. A regression here previously froze every streak
 * at 1. The Firestore transaction is simulated against an in-memory document so
 * the real logic of both writers (and their ordering) is exercised without an
 * emulator.
 */
const store: { value: Record<string, unknown> | null } = { value: null };

const resolveIncrements = (
  base: Record<string, unknown>,
  data: Record<string, unknown>
): Record<string, unknown> => {
  const out = { ...base };
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && '__inc' in (val as Record<string, unknown>)) {
      out[key] = ((base[key] as number) || 0) + (val as { __inc: number }).__inc;
    } else {
      out[key] = val;
    }
  }
  return out;
};

const mockRunTransaction = jest.fn(
  async (_db: unknown, fn: (tx: unknown) => unknown) => {
    const tx = {
      get: async () => ({
        exists: () => store.value !== null,
        data: () => store.value,
      }),
      set: (_ref: unknown, data: Record<string, unknown>) => {
        store.value = resolveIncrements({}, data);
      },
      update: (_ref: unknown, data: Record<string, unknown>) => {
        store.value = resolveIncrements(store.value ?? {}, data);
      },
    };
    return fn(tx);
  }
);

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ __ref: true })),
  runTransaction: (...a: [unknown, (tx: unknown) => unknown]) => mockRunTransaction(...a),
  increment: (n: number) => ({ __inc: n }),
  // Imported at module load but unused by these two writers.
  collection: jest.fn(),
  getDocs: jest.fn(),
  getCountFromServer: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  addDoc: jest.fn(),
  startAt: jest.fn(),
  endAt: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1' } } }));

import { updateUserStudyStats, updateDailyStreak } from '../firestore';
import { isoDate, previousIsoDate } from '../../utils/study-stats';

const session = { duration: 300, cardsStudied: 8, accuracy: 90, masteredCards: 2 };

beforeEach(() => {
  store.value = null;
  jest.clearAllMocks();
});

describe('streak writer interaction', () => {
  it('advances the streak when the prior session was yesterday', async () => {
    store.value = {
      streak: 3,
      lastStudyDate: previousIsoDate(),
      averageAccuracy: 80,
      totalStudySessions: 2,
      todayStudyMinutes: 10,
    };

    await updateUserStudyStats('u1', session);
    // updateUserStudyStats must leave lastStudyDate alone for the streak writer.
    expect(store.value.lastStudyDate).toBe(previousIsoDate());

    await updateDailyStreak('u1');
    expect(store.value.streak).toBe(4);
    expect(store.value.lastStudyDate).toBe(isoDate());
  });

  it('is idempotent across multiple sessions on the same day', async () => {
    store.value = {
      streak: 4,
      lastStudyDate: isoDate(),
      averageAccuracy: 80,
      totalStudySessions: 2,
      todayStudyMinutes: 10,
    };

    await updateUserStudyStats('u1', session);
    await updateDailyStreak('u1');

    expect(store.value.streak).toBe(4);
  });

  it('seeds a streak of 1 on the very first session', async () => {
    await updateUserStudyStats('u1', session);
    await updateDailyStreak('u1');

    expect(store.value?.streak).toBe(1);
    expect(store.value?.lastStudyDate).toBe(isoDate());
  });
});
