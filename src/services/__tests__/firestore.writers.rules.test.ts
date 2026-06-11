/**
 * Emulator-level tests for the study-stats *writers* in `services/firestore.ts`
 * — `updateStudyStats`, `updateUserStudyStats` and `updateDailyStreak`.
 *
 * The pure streak / running-average math lives in `utils/study-stats.ts` and is
 * unit-tested there. These tests cover the other half the analysis flagged as
 * still-untested: that the writers correctly read the existing document, branch
 * on the first-session / new-day cases, and persist the right shape through real
 * Firestore transactions, `increment()`s and Timestamp round-tripping.
 *
 * Not part of `npm test`; run with `npm run test:rules` (boots the emulator).
 */
import { readFileSync } from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const USER = 'alice';

// The writers operate on the module-level `db`/`auth` exported from
// `services/firebase`, which reads Vite's `import.meta.env` at import time and
// points at the real project. Replace it with an emulator-backed, authenticated
// Firestore instance. The getters defer to the live values so the instance can
// be wired up in `beforeAll`, once the emulator is ready.
let mockDb: Firestore;
const mockAuth = { currentUser: { uid: USER } };
jest.mock('../firebase', () => ({
  get db() {
    return mockDb;
  },
  get auth() {
    return mockAuth;
  },
}));

import {
  updateStudyStats,
  updateUserStudyStats,
  updateDailyStreak,
  addFlashcard,
  categoryDocumentId,
  getCategories,
} from '../firestore';
import { isoDate, previousIsoDate } from '../../utils/study-stats';

let testEnv: RulesTestEnvironment;

const statsRef = () => doc(mockDb, 'users', USER, 'stats', 'study');
const seed = (data: Record<string, unknown>) => setDoc(statsRef(), data);
const read = async () => {
  const snap = await getDoc(statsRef());
  if (!snap.exists()) throw new Error('expected stats document to exist');
  return snap.data() as Record<string, any>;
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    // A project ID distinct from the security-rules suite: both suites run in
    // parallel against the one emulator and each wipes its project in
    // `beforeEach`, so they must not share a data namespace.
    projectId: 'demo-flashcard-writers',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  mockDb = testEnv.authenticatedContext(USER).firestore() as unknown as Firestore;
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});


describe('category migration', () => {
  it('copies an owner-readable legacy category into the private user subtree', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'categories', 'legacy-sat'), {
        name: 'SAT',
        userId: USER,
        count: 4,
      });
    });

    await expect(getCategories(USER)).resolves.toEqual([
      expect.objectContaining({ id: categoryDocumentId('SAT'), name: 'SAT', count: 4 }),
    ]);

    const migrated = await getDoc(doc(
      mockDb,
      'users',
      USER,
      'categories',
      categoryDocumentId('SAT')
    ));
    expect(migrated.data()).toMatchObject({ name: 'SAT', count: 4 });
  });
});

describe('addFlashcard category writes', () => {
  it('stores normalized categories in the owner subtree and increments each once', async () => {
    await addFlashcard({
      userId: USER,
      word: 'abate',
      englishDefinition: 'become less intense',
      chineseTranslation: '減弱',
      partOfSpeech: 'verb',
      categories: [' SAT ', 'sat', 'Exam Prep'],
      difficulty: 0,
      created: new Date(),
      nextReview: new Date(),
      mastered: false,
    });

    const sat = await getDoc(doc(
      mockDb,
      'users',
      USER,
      'categories',
      categoryDocumentId('SAT')
    ));
    const examPrep = await getDoc(doc(
      mockDb,
      'users',
      USER,
      'categories',
      categoryDocumentId('Exam Prep')
    ));

    expect(sat.data()).toMatchObject({ name: 'SAT', count: 1 });
    expect(examPrep.data()).toMatchObject({ name: 'Exam Prep', count: 1 });
  });
});

describe('updateStudyStats (transaction)', () => {
  const session = {
    duration: 300,
    cardsStudied: 10,
    accuracy: 80,
    streak: 4,
    masteredCards: 3,
  };

  it('seeds a fresh stats document on the first session', async () => {
    await updateStudyStats(USER, session);

    const data = await read();
    expect(data.totalCards).toBe(10);
    expect(data.masteredCards).toBe(3);
    expect(data.averageAccuracy).toBe(80);
    expect(data.totalSessions).toBe(1);
    expect(data.longestStreak).toBe(4);
    expect(data.todayCards).toBe(10);
    expect(data.lastStudied).toBeInstanceOf(Timestamp);
  });

  it('accumulates totals and folds the new accuracy into the running average', async () => {
    await seed({
      lastStudied: Timestamp.now(), // same calendar day → todayCards accumulates
      totalCards: 5,
      masteredCards: 1,
      averageAccuracy: 60,
      totalSessions: 1,
      longestStreak: 7,
      todayCards: 5,
    });

    await updateStudyStats(USER, session);

    const data = await read();
    expect(data.totalCards).toBe(15);
    expect(data.masteredCards).toBe(4);
    // (60 * 1 + 80) / (1 + 1) = 70
    expect(data.averageAccuracy).toBe(70);
    expect(data.totalSessions).toBe(2);
    // existing 7 beats this session's 4
    expect(data.longestStreak).toBe(7);
    // same day → 5 + 10
    expect(data.todayCards).toBe(15);
  });

  it('resets todayCards when the last session was on an earlier day', async () => {
    await seed({
      lastStudied: Timestamp.fromDate(new Date('2020-01-01T00:00:00Z')),
      totalCards: 5,
      masteredCards: 1,
      averageAccuracy: 60,
      totalSessions: 1,
      longestStreak: 2,
      todayCards: 5,
    });

    await updateStudyStats(USER, session);

    const data = await read();
    // new day → todayCards starts over from this session
    expect(data.todayCards).toBe(10);
    // lifetime totals still accumulate across days
    expect(data.totalCards).toBe(15);
    // this session's streak (4) now exceeds the stored longest (2)
    expect(data.longestStreak).toBe(4);
  });
});

describe('updateUserStudyStats', () => {
  const session = {
    duration: 300, // → 5 minutes
    cardsStudied: 8,
    accuracy: 90,
    masteredCards: 2,
  };

  it('seeds a fresh stats document on the first session', async () => {
    await updateUserStudyStats(USER, session);

    const data = await read();
    expect(data.streak).toBe(1);
    expect(data.totalCards).toBe(8);
    expect(data.masteredCards).toBe(2);
    expect(data.averageAccuracy).toBe(90);
    expect(data.studyMinutes).toBe(5);
    expect(data.totalStudySessions).toBe(1);
    expect(data.todayStudyMinutes).toBe(5);
    expect(data.weeklyProgress).toBe(5);
    expect(data.lastStudyDate).toBe(isoDate());
  });

  it('increments lifetime totals and accumulates today on the same day', async () => {
    await seed({
      streak: 3,
      totalCards: 20,
      masteredCards: 4,
      averageAccuracy: 70,
      studyMinutes: 30,
      lastStudyDate: isoDate(),
      totalStudySessions: 2,
      todayStudyMinutes: 10,
      weeklyProgress: 25,
    });

    await updateUserStudyStats(USER, session);

    const data = await read();
    expect(data.totalCards).toBe(28);
    expect(data.masteredCards).toBe(6);
    expect(data.studyMinutes).toBe(35);
    expect(data.totalStudySessions).toBe(3);
    // updateRunningAverage(70, 2, 90) = (70*2 + 90) / 3 = 76.66…
    expect(data.averageAccuracy).toBeCloseTo(76.6667, 3);
    // same day → 10 + 5
    expect(data.todayStudyMinutes).toBe(15);
    expect(data.weeklyProgress).toBe(30);
    expect(data.lastStudyDate).toBe(isoDate());
  });

  it('resets todayStudyMinutes when the last session was on an earlier day', async () => {
    await seed({
      streak: 3,
      totalCards: 20,
      masteredCards: 4,
      averageAccuracy: 70,
      studyMinutes: 30,
      lastStudyDate: previousIsoDate(),
      totalStudySessions: 2,
      todayStudyMinutes: 10,
      weeklyProgress: 25,
    });

    await updateUserStudyStats(USER, session);

    const data = await read();
    // new day → today's minutes start over at this session's 5
    expect(data.todayStudyMinutes).toBe(5);
    // lifetime minutes still accumulate
    expect(data.studyMinutes).toBe(35);
    // updateUserStudyStats no longer advances lastStudyDate; the daily-streak
    // writer (which runs next) owns it and needs to still see the prior day.
    expect(data.lastStudyDate).toBe(previousIsoDate());
  });

  it('leaves the streak for updateDailyStreak: a day-boundary session increments it', async () => {
    // Regression: updateUserStudyStats used to stamp lastStudyDate=today before
    // updateDailyStreak ran, so the streak could never advance past its seed.
    await seed({
      streak: 3,
      lastStudyDate: previousIsoDate(),
      averageAccuracy: 80,
      totalStudySessions: 2,
    });

    await updateUserStudyStats(USER, session);
    await updateDailyStreak(USER);

    const data = await read();
    expect(data.streak).toBe(4);
    expect(data.lastStudyDate).toBe(isoDate());
  });
});

describe('updateDailyStreak (transaction)', () => {
  it('starts the streak at 1 when no document exists', async () => {
    await updateDailyStreak(USER);

    const data = await read();
    expect(data.streak).toBe(1);
    expect(data.lastStudyDate).toBe(isoDate());
  });

  it('extends the streak when the last study day was yesterday', async () => {
    await seed({ streak: 3, lastStudyDate: previousIsoDate() });

    await updateDailyStreak(USER);

    const data = await read();
    expect(data.streak).toBe(4);
    expect(data.lastStudyDate).toBe(isoDate());
  });

  it('is idempotent when already studied today', async () => {
    await seed({ streak: 3, lastStudyDate: isoDate() });

    await updateDailyStreak(USER);

    const data = await read();
    expect(data.streak).toBe(3);
  });

  it('resets the streak to 1 after a missed day', async () => {
    await seed({ streak: 9, lastStudyDate: '2020-01-01' });

    await updateDailyStreak(USER);

    const data = await read();
    expect(data.streak).toBe(1);
    expect(data.lastStudyDate).toBe(isoDate());
  });
});
