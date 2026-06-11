// The firestore service imports `../firebase`, which reads Vite's
// `import.meta.env` at module load — that doesn't exist under ts-jest's
// CommonJS target. Mocking `../firebase` (and the Firestore SDK) keeps that
// initialization out of the test while still exercising the real batching
// and counter-aggregation logic.
jest.mock('../firebase', () => ({ db: {}, auth: {} }));

interface RecordedBatch {
  deletes: Array<{ path: string }>;
  sets: Array<{ ref: { path: string }; data: any; options: any }>;
  committed: boolean;
}

const batches: RecordedBatch[] = [];
const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  doc: jest.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  query: jest.fn((ref: unknown) => ref),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAt: jest.fn(),
  endAt: jest.fn(),
  increment: jest.fn((n: number) => ({ increment: n })),
  writeBatch: jest.fn(() => {
    const batch: RecordedBatch & {
      delete: (ref: { path: string }) => void;
      set: (ref: { path: string }, data: any, options: any) => void;
      commit: () => Promise<void>;
    } = {
      deletes: [],
      sets: [],
      committed: false,
      delete(ref) { this.deletes.push(ref); },
      set(ref, data, options) { this.sets.push({ ref, data, options }); },
      async commit() { this.committed = true; },
    };
    batches.push(batch);
    return batch;
  }),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  getCountFromServer: jest.fn(),
  runTransaction: jest.fn(),
}));

import {
  deleteFlashcards,
  deleteCategoryWithWords,
  isWordInCategory,
} from '../firestore';

beforeEach(() => {
  batches.length = 0;
  mockDeleteDoc.mockReset();
  mockGetDocs.mockReset();
});

describe('deleteFlashcards', () => {
  it('does nothing for an empty list', async () => {
    await deleteFlashcards('user-1', []);
    expect(batches).toHaveLength(0);
  });

  it('deletes each card and aggregates category decrements', async () => {
    await deleteFlashcards('user-1', [
      { id: 'a', categories: ['TOEFL', 'Verbs'] },
      { id: 'b', categories: ['TOEFL'] },
      { id: 'c', categories: [] },
    ]);

    expect(batches).toHaveLength(1);
    const [batch] = batches;
    expect(batch.committed).toBe(true);
    expect(batch.deletes.map(ref => ref.path)).toEqual([
      'users/user-1/flashcards/a',
      'users/user-1/flashcards/b',
      'users/user-1/flashcards/c',
    ]);

    // One counter update per category regardless of how many deleted cards
    // referenced it, mirroring the increment(1) upserts on insert.
    const counterByPath = new Map(
      batch.sets.map(({ ref, data }) => [ref.path, data.count.increment])
    );
    expect(counterByPath.get('users/user-1/categories/toefl')).toBe(-2);
    expect(counterByPath.get('users/user-1/categories/verbs')).toBe(-1);
    expect(batch.sets).toHaveLength(2);
    expect(batch.sets.every(({ options }) => options?.merge === true)).toBe(true);
  });

  it('splits deletions across batches at the 500-operation limit', async () => {
    const cards = Array.from({ length: 600 }, (_, i) => ({
      id: `card-${i}`,
      categories: [] as string[],
    }));

    await deleteFlashcards('user-1', cards);

    expect(batches).toHaveLength(2);
    expect(batches[0].deletes).toHaveLength(500);
    expect(batches[1].deletes).toHaveLength(100);
    expect(batches.every(batch => batch.committed)).toBe(true);
  });

  it('never mixes counter updates and deletes in a batch once chunking kicks in', async () => {
    // 499 deletes + 2 counter updates exceed one batch. Counters must come
    // after every delete, in their own batch: if a commit fails partway and
    // the caller retries, replayed deletes are no-ops and each decrement is
    // applied at most once instead of drifting the counts downward.
    const cards = Array.from({ length: 499 }, (_, i) => ({
      id: `card-${i}`,
      categories: [i === 0 ? 'TOEFL' : 'Verbs'],
    }));

    await deleteFlashcards('user-1', cards);

    expect(batches).toHaveLength(2);
    expect(batches[0].deletes).toHaveLength(499);
    expect(batches[0].sets).toHaveLength(0);
    expect(batches[1].deletes).toHaveLength(0);
    expect(batches[1].sets).toHaveLength(2);
  });
});

describe('isWordInCategory', () => {
  it('matches by canonical ID, so casing variants count as members', () => {
    expect(isWordInCategory({ categories: ['toefl'] }, 'TOEFL')).toBe(true);
    expect(isWordInCategory({ categories: ['TOEFL', 'Nouns'] }, 'toefl')).toBe(true);
    expect(isWordInCategory({ categories: ['Verbs'] }, 'TOEFL')).toBe(false);
    expect(isWordInCategory({ categories: [] }, 'TOEFL')).toBe(false);
    expect(isWordInCategory({}, 'TOEFL')).toBe(false);
  });
});

describe('deleteCategoryWithWords', () => {
  it('deletes the provided member cards and the category document itself', async () => {
    // The caller supplies the member list (instead of this function
    // re-querying it) so a retry after a partial failure replays the exact
    // same deletion set; here that includes a variant-cased member.
    await deleteCategoryWithWords('user-1', 'TOEFL', [
      { id: 'a', categories: ['TOEFL', 'Nouns'] },
      { id: 'b', categories: ['toefl'] },
    ]);

    expect(batches).toHaveLength(1);
    expect(batches[0].deletes.map(ref => ref.path)).toEqual([
      'users/user-1/flashcards/a',
      'users/user-1/flashcards/b',
    ]);
    // Cards in the deleted set may belong to other categories, whose
    // counters must shrink too.
    const counterByPath = new Map(
      batches[0].sets.map(({ ref, data }) => [ref.path, data.count.increment])
    );
    expect(counterByPath.get('users/user-1/categories/nouns')).toBe(-1);

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc.mock.calls[0][0].path).toBe('users/user-1/categories/toefl');
  });
});
