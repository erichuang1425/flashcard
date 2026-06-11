import { auth, db } from './firebase';
import {
  collection, addDoc, getDocs, getCountFromServer, query, where, orderBy,
  updateDoc, deleteDoc, doc, writeBatch, startAt, endAt, limit, runTransaction, increment, getDoc, setDoc,
  QueryConstraint
}  from 'firebase/firestore';
import { Flashcard, StudySessionSummary, StudyStats, Worksheet, VocabularyWord, WorksheetStats, VocabularyDefinition, DiaryEntry } from '../types';
import { shuffle } from '../utils/helpers';
import { DEFAULT_EASE } from '../utils/spaced-repetition';
import { isoDate, previousIsoDate, nextStreak, updateRunningAverage } from '../utils/study-stats';


export const categoryDocumentId = (name: string): string => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) throw new Error('Category name is required');
  return encodeURIComponent(normalized);
};

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

interface FlashcardDocument {
  id: string;
  word: string;
  englishDefinition: string;
  partOfSpeech: string;
  categories: string[];
  [key: string]: any; 
}

export const addFlashcard = async (flashcard: Omit<Flashcard, 'id'>) => {
  const batch = writeBatch(db);

  try {
    const categories = normalizeCategoryNames(flashcard.categories);
    const flashcardRef = doc(collection(db, 'users', flashcard.userId, 'flashcards'));
    batch.set(flashcardRef, {
      ...flashcard,
      categories,
      lastReviewed: null,
      nextReview: new Date(),
      // Initial SM-2 scheduling state so new cards start in the learning step.
      easeFactor: DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
      difficulty: flashcard.difficulty ?? 0,
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
    difficulty: number;
    easeFactor: number;
    interval: number;
    repetitions: number;
    mastered: boolean;
  }
) => {
  const cardRef = doc(db, 'users', userId, 'flashcards', cardId);
  await updateDoc(cardRef, {
    lastReviewed: new Date(),
    nextReview: schedule.nextReview,
    difficulty: schedule.difficulty,
    easeFactor: schedule.easeFactor,
    interval: schedule.interval,
    repetitions: schedule.repetitions,
    mastered: schedule.mastered,
  });
};


export const addWorksheet = async (worksheetData: Omit<Worksheet, 'id'>) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const worksheet = {
      ...worksheetData,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      content: worksheetData.content || null,
      questions: worksheetData.questions || []
    };
    
    const worksheetRef = await addDoc(
      collection(db, 'users', auth.currentUser.uid, 'worksheets'), 
      worksheet
    );
    
    return worksheetRef.id;
  } catch (error) {
    console.error('Error adding worksheet:', error);
    throw error;
  }
};

export const getUserWorksheets = async (userId: string) => {

  const q = query(collection(db, 'users', userId, 'worksheets'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Worksheet[]; 
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
      where('word', '<=', term + '\uf8ff'),
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
  // cursors, then limit \u2014 appending a where() after startAt()/endAt() throws.
  const constraints: QueryConstraint[] = [];

  if (options.partOfSpeech) {
    constraints.push(where('partOfSpeech', '==', options.partOfSpeech));
  }

  if (options.searchTerm) {
    constraints.push(
      orderBy('word'),
      startAt(options.searchTerm),
      endAt(options.searchTerm + '\uf8ff')
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
    endAt(initial + '\uf8ff'),
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

export const updateStudyStats = async (userId: string, sessionSummary: StudySessionSummary) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  
  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      
      if (!statsDoc.exists()) {
        transaction.set(statsRef, {
          lastStudied: new Date(),
          totalCards: sessionSummary.cardsStudied,
          masteredCards: sessionSummary.masteredCards,
          averageAccuracy: sessionSummary.accuracy,
          totalSessions: 1,
          longestStreak: sessionSummary.streak,
          todayCards: sessionSummary.cardsStudied
        });
      } else {
        const currentStats = statsDoc.data() as StudyStats;
        // lastStudied is read back from Firestore as a Timestamp, which has no
        // toDateString(); normalize to a JS Date before comparing.
        const lastStudiedRaw = currentStats.lastStudied as unknown as { toDate?: () => Date } | Date | undefined;
        const lastStudied =
          lastStudiedRaw && typeof (lastStudiedRaw as any).toDate === 'function'
            ? (lastStudiedRaw as { toDate: () => Date }).toDate()
            : (lastStudiedRaw as Date) ?? new Date(0);
        const isNewDay = new Date().toDateString() !== lastStudied.toDateString();
        
        transaction.update(statsRef, {
          lastStudied: new Date(),
          totalCards: currentStats.totalCards + sessionSummary.cardsStudied,
          masteredCards: currentStats.masteredCards + sessionSummary.masteredCards,
          averageAccuracy: (currentStats.averageAccuracy * currentStats.totalSessions + sessionSummary.accuracy) / (currentStats.totalSessions + 1),
          totalSessions: currentStats.totalSessions + 1,
          longestStreak: Math.max(currentStats.longestStreak, sessionSummary.streak),
          todayCards: isNewDay ? sessionSummary.cardsStudied : currentStats.todayCards + sessionSummary.cardsStudied
        });
      }
    });
  } catch (error) {
    console.error('Error updating study stats:', error);
    throw error;
  }
};

export interface Category {
  id?: string;
  name: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export const addCategory = async (name: string, userId: string): Promise<string> => {
  const trimmedName = name.trim();
  const categoryId = categoryDocumentId(trimmedName);
  const categoryRef = doc(db, 'users', userId, 'categories', categoryId);

  try {
    await runTransaction(db, async transaction => {
      const existing = await transaction.get(categoryRef);
      if (existing.exists()) return;

      const now = new Date();
      transaction.set(categoryRef, {
        name: trimmedName,
        count: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
    return categoryId;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const [currentSnapshot, legacySnapshot] = await Promise.all([
      getDocs(categoriesRef),
      getDocs(query(collection(db, 'categories'), where('userId', '==', userId))),
    ]);

    const categories = new Map<string, Category>();
    currentSnapshot.docs.forEach(categoryDoc => {
      categories.set(categoryDoc.id, {
        id: categoryDoc.id,
        name: categoryDoc.data().name,
        count: categoryDoc.data().count ?? 0,
        createdAt: categoryDoc.data().createdAt?.toDate(),
        updatedAt: categoryDoc.data().updatedAt?.toDate(),
      });
    });

    // Migrate legacy global categories lazily. Existing user-scoped documents
    // win so repeated reads cannot inflate counts or overwrite newer metadata.
    const migrationBatch = writeBatch(db);
    let hasMigrations = false;
    legacySnapshot.docs.forEach(legacyDoc => {
      const data = legacyDoc.data();
      if (!data.name) return;
      const id = categoryDocumentId(data.name);
      if (categories.has(id)) return;

      const category: Category = {
        id,
        name: data.name.trim(),
        count: data.count ?? 0,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
      categories.set(id, category);
      migrationBatch.set(doc(categoriesRef, id), {
        name: category.name,
        count: category.count,
        createdAt: category.createdAt ?? new Date(),
        updatedAt: category.updatedAt ?? new Date(),
      });
      hasMigrations = true;
    });

    if (hasMigrations) await migrationBatch.commit();
    return [...categories.values()];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const incrementCategoryCount = async (userId: string, categoryName: string) => {
  const categoryRef = doc(
    db,
    'users',
    userId,
    'categories',
    categoryDocumentId(categoryName)
  );
  await setDoc(
    categoryRef,
    {
      name: categoryName.trim(),
      count: increment(1),
      updatedAt: new Date(),
    },
    { merge: true }
  );
};



export interface UserStudyStats {
  lastStudied: Date;
  streak: number;
  totalCards: number;
  masteredCards: number;
  averageAccuracy: number;
  studyMinutes: number;
  lastStudyDate: string; // Store as YYYY-MM-DD for easy comparison
  totalStudySessions: number;
  todayStudyMinutes: number;
  weeklyStudyGoal: number;
  weeklyProgress: number;
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  weekStart: Date;
}

export const getUserStudyStats = async (userId: string): Promise<UserStudyStats> => {
  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  const statsDoc = await getDoc(statsRef);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week

  const defaultStats: UserStudyStats = {
    lastStudied: new Date(),
    streak: 0,
    totalCards: 0,
    masteredCards: 0,
    averageAccuracy: 0,
    totalStudyMinutes: 0,
    weeklyStudyMinutes: 0,
    weeklyStudyGoal: 60,
    totalStudySessions: 0,
    todayStudyMinutes: 0,
    studyMinutes: 0,
    lastStudyDate: new Date().toISOString().split('T')[0],
    weeklyProgress: 0,
    weekStart: weekStart
  };

  if (!statsDoc.exists()) {
    const totalStats = await getTotalCardsCount(userId);
    await setDoc(statsRef, {
      ...defaultStats,
      createdAt: new Date(),
      weekStart: weekStart,
      totalCards: totalStats.totalCards || 0,
    });
    return defaultStats;
  }

  const data = statsDoc.data();
  
  // Convert any Timestamps to Dates
  const stats: UserStudyStats = {
    ...defaultStats,
    lastStudied: data.lastStudied?.toDate() || new Date(),
    streak: Number(data.streak || 0),
    totalCards: Number(data.totalCards || 0),
    masteredCards: Number(data.masteredCards || 0),
    averageAccuracy: Number(data.averageAccuracy || 0),
    studyMinutes: Number(data.studyMinutes || 0),
    totalStudySessions: Number(data.totalStudySessions || 0),
    todayStudyMinutes: Number(data.todayStudyMinutes || 0),
    weeklyStudyGoal: Number(data.weeklyStudyGoal || 60),
    weeklyProgress: Number(data.weeklyProgress || 0),
    totalStudyMinutes: Number(data.totalStudyMinutes || 0),
    weeklyStudyMinutes: Number(data.weeklyStudyMinutes || 0),
    lastStudyDate: data.lastStudyDate || new Date().toISOString().split('T')[0],
    weekStart: data.weekStart?.toDate() || weekStart
  };

  return stats;
};

export const updateDailyStreak = async (userId: string) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  
  return runTransaction(db, async (transaction) => {
    const statsDoc = await transaction.get(statsRef);
    const today = isoDate();

    if (!statsDoc.exists()) {
      return transaction.set(statsRef, {
        streak: 1,
        lastStudyDate: today
      });
    }

    const data = statsDoc.data();
    const newStreak = nextStreak(data.streak, data.lastStudyDate, today, previousIsoDate());

    return transaction.update(statsRef, {
      streak: newStreak,
      lastStudyDate: today
    });
  });
};

export const updateUserStudyStats = async (
  userId: string,
  sessionData: {
    duration: number;
    cardsStudied: number;
    accuracy: number;
    masteredCards: number;
  }
) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  const today = isoDate();
  const sessionMinutes = Math.round(sessionData.duration / 60);

  try {
    // Transaction so the running-average and new-day branching are computed
    // against a consistent read — a concurrent session from another tab can't
    // slip in between the read and the write.
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      const currentTime = new Date();

      if (!statsDoc.exists()) {
        transaction.set(statsRef, {
          lastStudied: currentTime,
          streak: 1,
          totalCards: sessionData.cardsStudied,
          masteredCards: sessionData.masteredCards,
          averageAccuracy: sessionData.accuracy,
          studyMinutes: sessionMinutes,
          lastStudyDate: today,
          totalStudySessions: 1,
          todayStudyMinutes: sessionMinutes,
          weeklyStudyGoal: 60, // Default weekly goal (kept consistent with getUserStudyStats)
          weeklyProgress: sessionMinutes,
        });
        return;
      }

      const existingStats = statsDoc.data();
      const isNewDay = existingStats.lastStudyDate !== today;

      transaction.update(statsRef, {
        lastStudied: currentTime,
        totalCards: increment(sessionData.cardsStudied),
        masteredCards: increment(sessionData.masteredCards),
        studyMinutes: increment(sessionMinutes),
        averageAccuracy: updateRunningAverage(
          existingStats.averageAccuracy,
          existingStats.totalStudySessions,
          sessionData.accuracy
        ),
        lastStudyDate: today,
        totalStudySessions: increment(1),
        todayStudyMinutes: isNewDay
          ? sessionMinutes
          : increment(sessionMinutes),
        weeklyProgress: increment(sessionMinutes)
      });
    });
  } catch (error) {
    console.error('Error updating study stats:', error);
    throw error;
  }
};

export const updateWeeklyStudyGoal = async (userId: string) => {
  try {
    const cards = await getUserFlashcards(userId);
    const totalCards = cards.length;
    
    // Calculate recommended weekly study time
    // Base: 60 minutes minimum, or 0.5 minutes per card
    const recommendedWeeklyMinutes = Math.max(60, Math.ceil(totalCards * 0.5));
    
    const statsRef = doc(db, 'users', userId, 'stats', 'study');
    await setDoc(statsRef, {
      weeklyStudyGoal: recommendedWeeklyMinutes
    }, { merge: true });
    
    return recommendedWeeklyMinutes;
  } catch (error) {
    console.error('Error updating weekly study goal:', error);
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
    const operations: BatchOperation[] = cards.map(card => batch => {
      batch.delete(doc(db, 'users', userId, 'flashcards', card.id));
    });
    for (const [categoryId, count] of decrements) {
      operations.push(batch => {
        batch.set(
          doc(db, 'users', userId, 'categories', categoryId),
          { count: increment(-count), updatedAt: new Date() },
          { merge: true }
        );
      });
    }

    for (let start = 0; start < operations.length; start += BATCH_OPERATION_LIMIT) {
      const batch = writeBatch(db);
      for (const apply of operations.slice(start, start + BATCH_OPERATION_LIMIT)) {
        apply(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deleting flashcards:', error);
    throw error;
  }
};

/**
 * Delete a whole set: every flashcard tagged with the category plus the
 * category document itself. Returns the deleted words so callers can update
 * local state — cards may also belong to other categories whose counts moved.
 */
export const deleteCategoryWithWords = async (
  userId: string,
  categoryName: string
): Promise<VocabularyWord[]> => {
  try {
    const words = await getWordsByCategory(userId, categoryName);
    await deleteFlashcards(userId, words);
    await deleteDoc(
      doc(db, 'users', userId, 'categories', categoryDocumentId(categoryName))
    );
    return words;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const deleteWorksheet = async (userId: string, worksheetId: string) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await deleteDoc(worksheetRef);
  } catch (error) {
    console.error('Error deleting worksheet:', error);
    throw error;
  }
};

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const getWorksheet = async (userId: string, worksheetId: string): Promise<Worksheet | null> => {
  try {
    const docRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    
    return {
      id: docSnap.id,
      title: data.title || 'Untitled Worksheet',
      description: data.description || '',
      questions: shuffleArray(data.questions || []), // Shuffle questions
      content: data.content || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      userId: data.userId,
      type: data.type || 'general',
      difficulty: data.difficulty || 'medium',
      timeLimit: data.timeLimit || 0,
      templateId: data.templateId || '',
      words: data.words || [],
      categories: data.categories || [],
      stats: data.stats || {
        attempts: 0,
        avgScore: 0,
        lastAttempt: null
      }
    } as Worksheet;
  } catch (error) {
    console.error('Error getting worksheet:', error);
    throw error;
  }
};

export const updateWorksheetContent = async (
  userId: string,
  worksheetId: string,
  content: { questions?: any[], content?: string }
) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await updateDoc(worksheetRef, {
      ...content,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating worksheet content:', error);
    throw error;
  }
};

export const updateWorksheetProgress = async (
  userId: string,
  worksheetId: string,
  stats: WorksheetStats
) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await updateDoc(worksheetRef, { stats });
  } catch (error) {
    console.error('Error updating worksheet progress:', error);
    throw error;
  }
};

export const addDiaryEntry = async (entry: Omit<DiaryEntry, 'id'>) => {
  try {
    const ref = await addDoc(collection(db, 'users', entry.userId, 'diary'), {
      ...entry,
      createdAt: entry.createdAt || new Date(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error adding diary entry:', error);
    throw error;
  }
};

export const getDiaryEntries = async (userId: string): Promise<DiaryEntry[]> => {
  try {
    const q = query(
      collection(db, 'users', userId, 'diary'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as DiaryEntry[];
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    throw error;
  }
};

export const updateDiaryEntry = async (
  userId: string,
  entryId: string,
  text: string
) => {
  try {
    const ref = doc(db, 'users', userId, 'diary', entryId);
    await updateDoc(ref, { text });
  } catch (error) {
    console.error('Error updating diary entry:', error);
    throw error;
  }
};

export const deleteDiaryEntry = async (userId: string, entryId: string) => {
  try {
    const ref = doc(db, 'users', userId, 'diary', entryId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    throw error;
  }
};
