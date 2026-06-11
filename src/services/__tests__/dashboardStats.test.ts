/**
 * Unit tests for the Home dashboard reader. The whole point of
 * `getDashboardStats` is to serve the dashboard from the persisted study-stats
 * document plus a few O(1) count aggregations, instead of streaming the user's
 * entire flashcard collection. These tests mock the Firestore primitives and
 * assert that it issues only count aggregations (never a `getDocs` deck read)
 * and maps the results onto the dashboard shape.
 */
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockGetCountFromServer = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => mockCollection(...a),
  query: (...a: unknown[]) => mockQuery(...a),
  where: (...a: unknown[]) => mockWhere(...a),
  doc: (...a: unknown[]) => mockDoc(...a),
  getDoc: (...a: unknown[]) => mockGetDoc(...a),
  setDoc: (...a: unknown[]) => mockSetDoc(...a),
  getDocs: (...a: unknown[]) => mockGetDocs(...a),
  getCountFromServer: (...a: unknown[]) => mockGetCountFromServer(...a),
  // Unused by getDashboardStats but imported at module load.
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  runTransaction: jest.fn(),
  increment: jest.fn(),
  orderBy: jest.fn(),
  startAt: jest.fn(),
  endAt: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('../firebase', () => ({ db: { __db: true }, auth: { currentUser: { uid: 'u1' } } }));

import { getDashboardStats } from '../firestore';

beforeEach(() => {
  jest.clearAllMocks();

  // Tag each query by its where() constraint so the count mock can answer with
  // the right number for total / studied / mastered / due reads.
  mockCollection.mockImplementation((_db, ...path: string[]) => ({ path: path.join('/') }));
  mockWhere.mockImplementation((field: string, op: string) => ({ field, op }));
  mockQuery.mockImplementation(
    (ref: { path: string }, constraint?: { field: string; op: string }) => ({
      path: ref.path,
      field: constraint?.field,
      op: constraint?.op,
    })
  );
  mockDoc.mockReturnValue({ __ref: 'users/u1/stats/study' });

  mockGetCountFromServer.mockImplementation((q: { field?: string; op?: string }) => {
    const counts: Record<string, number> = {
      'lastReviewed:!=': 6, // studied cards
      'mastered:==': 3,
      'nextReview:<=': 4, // due today (scheduled)
      'nextReview:==': 2, // unscheduled (null nextReview) cards, also due
    };
    const count = q.field ? counts[`${q.field}:${q.op}`] ?? 0 : 10; // unconstrained → deck size
    return Promise.resolve({ data: () => ({ count }) });
  });

  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      streak: 5,
      averageAccuracy: 88,
      totalStudyMinutes: 120,
      weeklyProgress: 30,
      weeklyStudyGoal: 60,
      totalStudySessions: 7,
    }),
  });
});

describe('getDashboardStats', () => {
  it('assembles the dashboard from the stats doc and count aggregations', async () => {
    const stats = await getDashboardStats('u1');

    expect(stats).toEqual({
      totalCards: 10,
      studiedCards: 6,
      remainingCards: 4,
      dueToday: 6, // 4 scheduled-and-due + 2 unscheduled
      mastered: 3,
      streak: 5,
      averageAccuracy: 88,
      studyMinutes: 120,
      weeklyProgress: 30,
      weeklyGoal: 60,
      totalStudySessions: 7,
    });
  });

  it('never streams the flashcard collection', async () => {
    await getDashboardStats('u1');
    expect(mockGetDocs).not.toHaveBeenCalled();
    // total + studied + mastered + due(scheduled) + due(unscheduled) = five
    // O(1) count aggregations, none of them a deck stream.
    expect(mockGetCountFromServer).toHaveBeenCalledTimes(5);
  });

  it('counts both scheduled-and-due and unscheduled cards as due', async () => {
    await getDashboardStats('u1');
    expect(mockWhere).toHaveBeenCalledWith('nextReview', '<=', expect.any(Date));
    expect(mockWhere).toHaveBeenCalledWith('nextReview', '==', null);
  });
});
