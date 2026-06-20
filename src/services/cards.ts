import { auth, db } from './firebase';
import {
  collection, getDocs, getCountFromServer, query, where, orderBy,
  updateDoc, doc, writeBatch, startAt, endAt, limit, increment,
  QueryConstraint,
} from 'firebase/firestore';
import { Flashcard, VocabularyWord, VocabularyDefinition } from '../types';
import { shuffle } from '../utils/helpers';
import { DEFAULT_EASE } from '../utils/spaced-repetition';
import { categoryDocumentId } from './categories';

const normalizeCategoryNames = (categories: string[] = []): string[] => {
  const unique = new Map<string, string>();
  for (const category of categories) {
    const name = category.trim();
    if (!name) continue;
    const id = categoryDocumentId(name);
    if (!unique.has(id)) unique.set(id, name);
  }
  return [...unique.values()];
};

export const addFlashcard = async (flashcard: Omit<Flashcard, 'id'>) => {
  const batch = writeBatch(db);

  try {
    const categories = normalizeCategoryNames(flashcard.categories);
    // `difficulty` is a retired, derived field. Strip it from the spread so the
    // various import call sites that still pass `difficulty: 0` can't reintroduce
    // it onto new card documents — this is the single write chokepoint.
    const { difficulty: _difficulty, ...cardData } = flashcard;
    const flashcardRef = doc(collection(db, 'users', flashcard.userId, 'flashcards'));
    batch.set(flashcardRef, {
      ...cardData,
      categories,
      lastReviewed: null,
      nextReview: new Date(),
      // Initial SM-2 scheduling state so new cards start in the learning step.
      easeFactor: DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
      mastered: false,
    });

    // Upsert category counters inside the SAME batch so the whole insert is a
    // single commit. Previously each category triggered its own awaited
    // setDoc round-trip that hard-coded `count: 1` (so counts never grew and
    // every imported card re-wrote the same doc). `increment` keeps the count
    // correct and the merge handles first-time creation.
    if (categories.length) {
      for (const categoryName of categories) {
        const categoryRef = doc(
          db,
          'users',
          flashcard.userId,
          'categories',
          categoryDocumentId(categoryName)
        );
        batch.set(
          categoryRef,
          {
            name: categoryName,
            count: increment(1),
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    }

    await batch.commit();
    return flashcardRef.id;
  } catch (error) {
    console.error('Error adding flashcard:', error);
    throw error;
  }
};

export const getUserFlashcards = async (userId: string): Promise<Flashcard[]> => {
  try {
    const q = query(
      collection(db, 'users', userId, 'flashcards'),
      orderBy('nextReview', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),

      nextReview: doc.data().nextReview?.toDate(),
      lastReviewed: doc.data().lastReviewed?.toDate(),
      created: doc.data().created?.toDate()
    })) as Flashcard[];
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    throw error;
  }
};

/**
 * Suggest vocabulary words to practice in the diary. Prefers cards that are due
 * for review (nextReview in the past); if none are due, falls back to the
 * next-upcoming cards. Reuses getUserFlashcards so the ordering and date
 * conversion stay consistent with the rest of the app.
 */
export const getSuggestedVocabulary = async (
  userId: string,
  count: number = 5
): Promise<Flashcard[]> => {
  const cards = await getUserFlashcards(userId);
  const now = new Date();

  const due = cards.filter(card => {
    if (!card.nextReview) return true;
    const reviewDate =
      card.nextReview instanceof Date ? card.nextReview : new Date(card.nextReview);
    return reviewDate <= now;
  });

  const pool = due.length > 0 ? due : cards;
  return pool.slice(0, count);
};

export const updateCardReview = async (
  userId: string,
  cardId: string,
  schedule: {
    nextReview: Date;
    easeFactor: number;
    interval: number;
    repetitions: number;
    mastered: boolean;
  }
) => {
  // `difficulty` is intentionally no longer persisted: it was derived from the
  // ease factor on every write yet read almost nowhere. Existing values are
  // left in place; where still shown it is derived on display from `easeFactor`.
  const cardRef = doc(db, 'users', userId, 'flashcards', cardId);
  await updateDoc(cardRef, {
    lastReviewed: new Date(),
    nextReview: schedule.nextReview,
    easeFactor: schedule.easeFactor,
    interval: schedule.interval,
    repetitions: schedule.repetitions,
    mastered: schedule.mastered,
  });
};

export const getVocabularyWords = async (pageLimit?: number): Promise<VocabularyWord[]> => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');

    // The library shows the signed-in user's whole flashcard collection.
    // Previously this query filtered on `isPublic == true`, but cards created
    // through Import/manual entry never set that flag — so an imported library
    // of hundreds of words showed up empty. The collection is already scoped to
    // the current user, so no extra visibility filter is needed.
    let q = query(
      collection(db, 'users', auth.currentUser.uid, 'flashcards'),
      orderBy('word')
    );

    if (pageLimit) {
      q = query(q, limit(pageLimit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VocabularyWord[];
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    throw error;
  }
};

export const searchVocabulary = async (term: string): Promise<VocabularyWord[]> => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');

    // Search the user's own library by word prefix. The old `isPublic == true`
    // filter excluded imported/manually-added cards (which never set that flag),
    // so worksheet word search came back empty for personal libraries.
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'flashcards'),
      where('word', '>=', term),
      where('word', '<=', term + ''),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VocabularyWord[];
  } catch (error) {
    console.error('Error searching vocabulary:', error);
    throw error;
  }
};

export const importVocabularyBatch = async (words: VocabularyWord[]) => {
  const batch = writeBatch(db);
  const vocabRef = collection(db, 'vocabulary');

  for (const word of words) {
    const docRef = doc(vocabRef);
    batch.set(docRef, {
      ...word,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  await batch.commit();
};

export const searchVocabularyAdvanced = async (
  options: {
    searchTerm?: string;
    partOfSpeech?: string;
    limit?: number;
  }
) => {
  // Firestore requires constraints in order: filters, then orderBy, then
  // cursors, then limit — appending a where() after startAt()/endAt() throws.
  const constraints: QueryConstraint[] = [];

  if (options.partOfSpeech) {
    constraints.push(where('partOfSpeech', '==', options.partOfSpeech));
  }

  if (options.searchTerm) {
    constraints.push(
      orderBy('word'),
      startAt(options.searchTerm),
      endAt(options.searchTerm + '')
    );
  }

  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  const querySnapshot = await getDocs(query(collection(db, 'vocabulary'), ...constraints));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (VocabularyWord & { id: string })[];
};

// Add indexing helpers
export const getVocabularyByInitial = async (initial: string) => {
  const q = query(
    collection(db, 'vocabulary'),
    orderBy('word'),
    startAt(initial),
    endAt(initial + ''),
    limit(50)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (VocabularyWord & { id: string })[];
};

// Statistics helper
export const getVocabularyStats = async () => {
  const q = query(collection(db, 'vocabulary'));
  const querySnapshot = await getDocs(q);

  const stats = {
    total: querySnapshot.size,
    byPartOfSpeech: {} as Record<string, number>
  };

  querySnapshot.forEach(doc => {
    const pos = doc.data().partOfSpeech;
    stats.byPartOfSpeech[pos] = (stats.byPartOfSpeech[pos] || 0) + 1;
  });

  return stats;
};

export const getRandomVocabularyWords = async (count: number = 3): Promise<VocabularyWord[]> => {
  const q = query(
    collection(db, 'vocabulary'),
    orderBy('word'),
    limit(count * 2)
  );
  const querySnapshot = await getDocs(q);
  const words = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (VocabularyWord & { id: string })[];

  // Shuffle and return requested count
  return shuffle(words).slice(0, count);
};

export const getVocabularyDefinitions = async (words: string[]): Promise<VocabularyDefinition[]> => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');

    // Process in batches of 30 due to Firestore 'in' operator limitation
    const batchSize = 30;
    const batches = [];

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'flashcards'),
        where('word', 'in', batch)
      );
      batches.push(getDocs(q));
    }

    const snapshots = await Promise.all(batches);
    const definitions: VocabularyDefinition[] = [];

    snapshots.forEach(snapshot => {
      definitions.push(...snapshot.docs.map(doc => ({
        word: doc.data().word,
        englishDefinition: doc.data().englishDefinition,
        chineseTranslation: doc.data().chineseTranslation,
        partOfSpeech: doc.data().partOfSpeech,
        examples: doc.data().examples || []
      })));
    });

    return definitions;
  } catch (error) {
    console.error('Error fetching vocabulary definitions:', error);
    throw error;
  }
};

export const getTotalCardsCount = async (userId: string) => {
  // Server-side count aggregations keep this at a couple of billable reads
  // instead of streaming every flashcard document just to size the collection.
  const cardsRef = collection(db, 'users', userId, 'flashcards');
  const [totalSnap, studiedSnap] = await Promise.all([
    getCountFromServer(query(cardsRef)),
    getCountFromServer(query(cardsRef, where('lastReviewed', '!=', null))),
  ]);

  const totalCards = totalSnap.data().count;
  const studiedCards = studiedSnap.data().count;

  return {
    totalCards,
    remainingCards: totalCards - studiedCards,
    studiedCards
  };
};

export const getMasteryCount = async (userId: string): Promise<number> => {
  // A card is mastered once the SM-2 scheduler has grown its interval past the
  // mastery threshold; that state is persisted on the `mastered` flag. Use a
  // count aggregation so this costs one read instead of one-per-mastered-card.
  const q = query(
    collection(db, 'users', userId, 'flashcards'),
    where('mastered', '==', true)
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

export const getDueCardsCount = async (
  userId: string,
  now: Date = new Date()
): Promise<number> => {
  // Cards whose nextReview has passed are due. Server-side counts keep this at
  // a constant couple of billable reads regardless of deck size — and, unlike a
  // stored counter, can't drift as cards become due through the passage of time.
  //
  // A `<=` range query skips documents whose nextReview is null, but the study
  // loader (isDueForReview) treats an unscheduled card as due, so those cards
  // are counted separately to keep the dashboard consistent with the queue.
  // (Documents missing the field entirely are unreachable by any Firestore
  // query; addFlashcard always stamps a concrete nextReview, so none exist.)
  const cardsRef = collection(db, 'users', userId, 'flashcards');
  const [dueSnap, unscheduledSnap] = await Promise.all([
    getCountFromServer(query(cardsRef, where('nextReview', '<=', now))),
    getCountFromServer(query(cardsRef, where('nextReview', '==', null))),
  ]);
  return dueSnap.data().count + unscheduledSnap.data().count;
};

export const getWordsByCategory = async (userId: string, category: string): Promise<VocabularyWord[]> => {
  const q = query(
    collection(db, `users/${userId}/flashcards`),
    where('categories', 'array-contains', category)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    word: doc.data().word,
    englishDefinition: doc.data().englishDefinition,
    chineseTranslation: doc.data().chineseTranslation || '',
    partOfSpeech: doc.data().partOfSpeech,
    categories: doc.data().categories || [],
    createdAt: doc.data().createdAt,
    lastReviewed: doc.data().lastReviewed,
    nextReview: doc.data().nextReview,
    difficulty: doc.data().difficulty
  }));
};

// Firestore caps a write batch at 500 operations; large deletions are split
// across sequential batches.
const BATCH_OPERATION_LIMIT = 500;

/**
 * Delete flashcards together with their category counter updates. Counter
 * decrements are aggregated per category so each batch carries one update per
 * category no matter how many of the deleted cards reference it — mirroring
 * the `increment(1)` upserts performed when cards are added.
 */
export const deleteFlashcards = async (
  userId: string,
  cards: Array<Pick<VocabularyWord, 'id' | 'categories'>>
): Promise<void> => {
  if (cards.length === 0) return;

  try {
    const decrements = new Map<string, number>();
    for (const card of cards) {
      for (const category of card.categories ?? []) {
        if (!category.trim()) continue;
        const categoryId = categoryDocumentId(category);
        decrements.set(categoryId, (decrements.get(categoryId) ?? 0) + 1);
      }
    }

    type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;
    const deleteOperations: BatchOperation[] = cards.map(card => batch => {
      batch.delete(doc(db, 'users', userId, 'flashcards', card.id));
    });
    const counterOperations: BatchOperation[] = [...decrements].map(
      ([categoryId, count]) => batch => {
        batch.set(
          doc(db, 'users', userId, 'categories', categoryId),
          { count: increment(-count), updatedAt: new Date() },
          { merge: true }
        );
      }
    );

    const commitChunks = async (operations: BatchOperation[]) => {
      for (let start = 0; start < operations.length; start += BATCH_OPERATION_LIMIT) {
        const batch = writeBatch(db);
        for (const apply of operations.slice(start, start + BATCH_OPERATION_LIMIT)) {
          apply(batch);
        }
        await batch.commit();
      }
    };

    if (deleteOperations.length + counterOperations.length <= BATCH_OPERATION_LIMIT) {
      // Everything fits in one atomic batch: a retry after failure replays
      // the whole deletion exactly once.
      await commitChunks([...deleteOperations, ...counterOperations]);
    } else {
      // Multi-batch deletions commit all card deletes before any counter
      // decrement, never mixing the two in one batch. If a commit fails
      // partway through and the caller retries, the replayed deletes are
      // no-ops and each decrement is applied at most once. Counter drift
      // would need the decrements themselves to span multiple batches —
      // a single deletion touching 500+ distinct categories.
      await commitChunks(deleteOperations);
      await commitChunks(counterOperations);
    }
  } catch (error) {
    console.error('Error deleting flashcards:', error);
    throw error;
  }
};
