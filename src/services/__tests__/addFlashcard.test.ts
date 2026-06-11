/**
 * Regression test for the retired SM-2 `difficulty` field: even though several
 * import call sites still pass `difficulty: 0`, `addFlashcard` must not persist
 * it onto new card documents. The Firestore primitives are mocked so we can
 * inspect the exact write payload handed to the batch.
 */
const mockWriteBatch = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockIncrement = jest.fn((n: number) => ({ __inc: n }));
const batchSet = jest.fn();
const batchCommit = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/firestore', () => ({
  writeBatch: (...a: unknown[]) => mockWriteBatch(...a),
  collection: (...a: unknown[]) => mockCollection(...a),
  doc: (...a: unknown[]) => mockDoc(...a),
  increment: (...a: [number]) => mockIncrement(...a),
  // Imported at module load but unused by addFlashcard.
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
  runTransaction: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({ db: { __db: true }, auth: { currentUser: { uid: 'u1' } } }));

import { addFlashcard } from '../firestore';

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteBatch.mockReturnValue({ set: batchSet, commit: batchCommit });
  mockCollection.mockReturnValue({ __collection: true });
  mockDoc.mockReturnValue({ id: 'card-1' });
});

describe('addFlashcard', () => {
  it('does not persist the retired difficulty field', async () => {
    await addFlashcard({
      userId: 'u1',
      word: 'ephemeral',
      partOfSpeech: 'adjective',
      englishDefinition: 'lasting a very short time',
      difficulty: 0, // a legacy import call site still passing this
      categories: ['SAT'],
      created: new Date(),
      nextReview: new Date(),
      mastered: false,
    });

    expect(batchSet).toHaveBeenCalled();
    const cardPayload = batchSet.mock.calls[0][1];
    expect(cardPayload).not.toHaveProperty('difficulty');
    // The real scheduling fields are still written.
    expect(cardPayload).toMatchObject({ word: 'ephemeral', interval: 0, repetitions: 0 });
  });
});
