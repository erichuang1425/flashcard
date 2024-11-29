import { auth, db } from './firebase';
import {saveQueueSnapshot, restoreQueueState} from './studyQueuePersistence';
import { 
  collection, addDoc, getDocs, query, where, orderBy, 
  updateDoc, deleteDoc, doc, writeBatch, startAt, endAt, limit, runTransaction, increment, getDoc, setDoc, startAfter, getCountFromServer, serverTimestamp, arrayUnion, arrayRemove, deleteField, documentId 
}  from 'firebase/firestore';
import { 
  Flashcard, StudySessionSummary, StudyStats, Worksheet, 
  VocabularyWord, WorksheetStats, VocabularyDefinition, 
  StudyProgress, StudyCardProgress, FlashcardCounter,
  FlashcardCollectionMetadata, FlashcardMetadata, SearchMetadata, 
  FlashcardItem,
  StudyQueue,
  QueueItemPerformance
} from '../types';
import { flashcardCache, categoryCache, worksheetCache, studyStatsCache, userWorksheetCache, analyticsCache } from '../utils/Cache';
import type { FlashcardsResponse } from '../types/responses';
import { 
  calculateNextReview, DEFAULT_CONFIG, 
  calculateSuccessRate, shouldResetLearningProgress, isCardMature, 
  ReviewResult, getNextCardState
} from '../utils/spaced-repetition';
import { FlashcardReviewLog } from '../types/flashcard';
import { calculateNewQueuePositionWithPerformance, cleanupQueue, rebalanceQueue, sortStudyQueueWithPerformance, validateQueue } from '../utils/queue-utils';
import { logger } from './logging';

interface FlashcardDocument {
  id: string;
  word: string;
  englishDefinition: string;
  partOfSpeech: string;
  categories: string[];
  exampleSentence?: string | null;  
  [key: string]: any; 
}

interface CollectionItem {
  id: string;
  word: string; 
  category?: string;
  updatedAt: Date;
}

interface CollectionCounter {
  count: number;
  lastUpdated: Date;
  items: CollectionItem[];
  categories: Record<string, number>;
  indexMap: Record<string, number>;
}

const updateCollectionCounter = async (
  userId: string, 
  collectionName: string, 
  increment: number
) => {
  const counterRef = doc(db, 'users', userId, 'counters', collectionName);
  
  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      if (!counterDoc.exists()) {
        transaction.set(counterRef, {
          count: Math.max(0, increment),
          lastUpdated: new Date()
        });
      } else {
        const newCount = Math.max(0, counterDoc.data().count + increment);
        transaction.update(counterRef, {
          count: newCount,
          lastUpdated: new Date()
        });
      }
    });
  } catch (error) {
    console.error(`Error updating ${collectionName} counter:`, error);
    throw error;
  }
};

export const initializeFlashcardCounter = async (userId: string) => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  
  try {
    await setDoc(counterRef, {
      items: [],
      categories: {},
      indexMap: {},
      lastUpdated: new Date(),
      metadata: {
        totalMastered: 0,
        lastStudied: null,
        averageAccuracy: 0,
        reviewsDue: 0,
        categoriesCount: 0,
        vocabList: [],
        progressStats: {
          new: 0,
          learning: 0,
          review: 0,
          relearn: 0
        },
        studyQueue: [],
        queueLastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error initializing flashcard counter:', error);
    throw error;
  }
};

export const initializeArticleCounter = async (userId: string) => {
  const counterRef = doc(db, 'users', userId, 'counters', 'articles');
  
  try {
    await setDoc(counterRef, {
      count: 0,
      items: [],
      lastUpdated: new Date(),
      categories: {},
      indexMap: {}
    });
  } catch (error) {
    console.error('Error initializing article counter:', error);
    throw error;
  }
};

export const addFlashcard = async (flashcard: Omit<Flashcard, 'id'>) => {
  const batch = writeBatch(db);
  
  try {
    const settingsDoc = await getDoc(doc(db, 'users', flashcard.userId, 'preferences', 'settings'));
    const srsType = settingsDoc.data()?.studySettings?.srsType || 'interval';

    const flashcardRef = doc(collection(db, 'users', flashcard.userId, 'flashcards'));
    batch.set(flashcardRef, {
      word: flashcard.word,
      englishDefinition: flashcard.englishDefinition,
      partOfSpeech: flashcard.partOfSpeech,
      chineseTranslation: flashcard.chineseTranslation,
      exampleSentence: flashcard.exampleSentence || null,
      categories: flashcard.categories || [],
      reviews: 0,
      totalCorrect: 0,
      successRate: 100,
      state: 'NEW',
      nextReview: new Date(),
      lastReviewed: null,
      created: new Date(),
      interval: 0,
      easeFactor: DEFAULT_CONFIG.startingEase,
      position: 0,
      srsType,
    });

    const queueItem: StudyQueue = {
      cardId: flashcardRef.id,
      nextPosition: 0,
      position: 0,
      state: 'NEW',
      interval: 0,
      easeFactor: DEFAULT_CONFIG.startingEase,
      nextReview: new Date(),
      srsType
    };

    const counterRef = doc(db, 'users', flashcard.userId, 'counters', 'flashcards');
    batch.update(counterRef, {
      count: increment(1),
      'metadata.studyQueue': arrayUnion(queueItem),
      'metadata.queueLastUpdated': new Date()
    });

    await batch.commit();
    return flashcardRef.id;
  } catch (error) {
    console.error('Error adding flashcard:', error);
    throw error;
  }
};

export const batchGetFlashcards = async (userId: string, cardIds: string[]): Promise<Flashcard[]> => {
  if (!cardIds.length) return [];

  const cachedCards = cardIds
    .map(id => flashcardCache.get(`flashcard_${userId}_${id}`))
    .filter(Boolean) as Flashcard[];

  const missingIds = cardIds.filter(id => 
    !flashcardCache.get(`flashcard_${userId}_${id}`)
  );

  if (!missingIds.length) {
    return cardIds.map(id => 
      flashcardCache.get(`flashcard_${userId}_${id}`)!
    );
  }

  const chunks = [];
  for (let i = 0; i < missingIds.length; i += 10) {
    chunks.push(missingIds.slice(i, i + 10));
  }

  const fetchedCards = await Promise.all(chunks.map(async (chunk) => {
    const q = query(
      collection(db, 'users', userId, 'flashcards'),
      where(documentId(), 'in', chunk)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const card = {
        id: doc.id,
        ...doc.data(),
        nextReview: doc.data().nextReview?.toDate(),
        lastReviewed: doc.data().lastReviewed?.toDate(),
        created: doc.data().created?.toDate()
      } as Flashcard;
      
      flashcardCache.set(`flashcard_${userId}_${doc.id}`, card);
      return card;
    });
  }));

  const allCards = cardIds.map(id => 
    flashcardCache.get(`flashcard_${userId}_${id}`)!
  );

  return allCards;
};

export const getUserFlashcards = async (
  userId: string, 
  pageLimit: number = 100,
  lastDoc?: any
): Promise<FlashcardsResponse> => {
  const cacheKey = `flashcards_${userId}_${pageLimit}_${lastDoc?.id || 'initial'}`;
  const cachedResult = flashcardCache.get(cacheKey);
  if (cachedResult) return cachedResult;

  let q = query(
    collection(db, 'users', userId, 'flashcards'),
    orderBy('nextReview', 'asc'),
    limit(pageLimit)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const result: FlashcardsResponse = {
    cards: snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      nextReview: doc.data().nextReview?.toDate(),
      lastReviewed: doc.data().lastReviewed?.toDate(),
      created: doc.data().created?.toDate()
    })) as Flashcard[],
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };

  flashcardCache.set(cacheKey, result);
  return result;
};

export const updateCardReview = async (
  userId: string,
  cardId: string,
  nextReview: Date,
  difficulty: number,
  mastered: boolean
): Promise<void> => {
  const cardRef = doc(db, 'users', userId, 'flashcards', cardId);
  await updateDoc(cardRef, {
    nextReview,
    difficulty,
    mastered,
    lastReviewed: serverTimestamp()
  });
};

export const addWorksheet = async (worksheetData: Omit<Worksheet, 'id'>) => {
  const batch = writeBatch(db);
  
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const counterRef = doc(db, 'users', auth.currentUser.uid, 'counters', 'worksheets');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      batch.set(counterRef, {
        count: 1,
        items: [],
        lastUpdated: serverTimestamp(),
        categories: {},
        indexMap: {}
      });
    } else {
      batch.update(counterRef, {
        count: increment(1),
        lastUpdated: serverTimestamp()
      });
    }

    const worksheetRef = doc(collection(db, 'users', auth.currentUser.uid, 'worksheets'));
    
    batch.set(worksheetRef, {
      ...worksheetData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      type: 'worksheet',
      userId: auth.currentUser.uid,
      content: worksheetData.content || null,
      questions: worksheetData.questions || [],
      stats: {
        ...worksheetData.stats,
        completed: 0,
        total: worksheetData.questions?.length || 0,
        accuracy: 0,
        lastAttempted: null
      }
    });

    await batch.commit();
    worksheetCache.delete(`worksheets-${auth.currentUser.uid}`);
    
    return worksheetRef.id;
  } catch (error) {
    console.error('Error adding worksheet:', error);
    throw error;
  }
};

export const getUserWorksheets = async (userId: string) => {
  const cachedWorksheets = userWorksheetCache.get(`worksheets-${userId}`);
  if (cachedWorksheets) return cachedWorksheets;

  const q = query(collection(db, 'users', userId, 'worksheets'));
  const querySnapshot = await getDocs(q);
  const worksheets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Worksheet[];

  userWorksheetCache.set(`worksheets-${userId}`, worksheets);
  return worksheets;
};



export const getFlashcard = async (userId: string, cardId: string): Promise<Flashcard> => {
  const docRef = doc(db, 'users', userId, 'flashcards', cardId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Flashcard not found');
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    nextReview: docSnap.data().nextReview?.toDate(),
    lastReviewed: docSnap.data().lastReviewed?.toDate(),
    created: docSnap.data().created?.toDate()
  } as Flashcard;
};

export const getVocabularyDefinitions = async (words: string[]): Promise<VocabularyDefinition[]> => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');

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

export const updateStudyStats = async (
  userId: string, 
  sessionSummary: StudySessionSummary,
  queuePerformance: QueueItemPerformance[]
) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  
  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      const counterDoc = await transaction.get(counterRef);
      
      const metadata = counterDoc.data()?.metadata || {};
      const queue = metadata.studyQueue || [];
      
      queuePerformance.forEach(perf => {
        const cardIndex = queue.findIndex((item: StudyQueue) => item.cardId === perf.cardId);
        if (cardIndex >= 0) {
          queue[cardIndex].performance = {
            ...queue[cardIndex].performance,
            ...perf
          };
        }
      });

      const queueStats = calculateQueueStats(queue);

      transaction.update(counterRef, {
        'metadata.studyQueue': queue,
        'metadata.queueStats': queueStats,
        'metadata.queueLastUpdated': new Date()
      });

      if (!statsDoc.exists()) {
        transaction.set(statsRef, {
          lastStudied: new Date(),
          totalCards: sessionSummary.cardsStudied,
          masteredCards: sessionSummary.masteredCards,
          averageAccuracy: sessionSummary.accuracy,
          totalSessions: 1,
          streak: 1,
          lastStudyDate: new Date().toISOString().split('T')[0],
          totalStudyMinutes: sessionSummary.duration,
          weeklyStudyMinutes: sessionSummary.duration,
          weekStart: getWeekStart()
        });
      } else {
        const currentStats = statsDoc.data();
        const newStats = calculateUpdatedStats(currentStats, sessionSummary);
        transaction.update(statsRef, newStats);
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
  try {

    const q = query(
      collection(db, 'categories'),
      where('name', '==', name),
      where('userId', '==', userId)
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      return existing.docs[0].id; 
    }

    const categoryRef = collection(db, 'categories');
    const docRef = await addDoc(categoryRef, {
      name,
      userId,
      count: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const cachedCategories = categoryCache.get('categories');
    if (cachedCategories) return cachedCategories;

    const snapshot = await getDocs(collection(db, 'categories'));
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      count: doc.data().count,
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    categoryCache.set('categories', categories);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const incrementCategoryCount = async (categoryId: string) => {
  const categoryRef = doc(db, 'categories', categoryId);
  await updateDoc(categoryRef, {
    count: increment(1),
    updatedAt: new Date()
  });
};

export interface UserStudyStats {
  lastStudied: Date;
  streak: number;
  totalCards: number;
  masteredCards: number;
  averageAccuracy: number;
  studyMinutes: number;
  lastStudyDate: string;
  totalStudySessions: number;
  todayStudyMinutes: number;
  weeklyStudyGoal: number;
  weeklyProgress: number;
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  weekStart: Date;
  createdAt: Date;
  totalStudyDays: number;
}

const calculateUpdatedStats = (
  currentStats: any,
  sessionSummary: StudySessionSummary
): Partial<UserStudyStats> => {
  const today = new Date().toISOString().split('T')[0];
  const isNewDay = currentStats.lastStudyDate !== today;

  return {
    lastStudied: new Date(),
    totalCards: currentStats.totalCards + sessionSummary.cardsStudied,
    masteredCards: currentStats.masteredCards + sessionSummary.masteredCards,
    averageAccuracy: ((currentStats.averageAccuracy * currentStats.totalSessions) + sessionSummary.accuracy) / (currentStats.totalSessions + 1),
    totalStudySessions: currentStats.totalSessions + 1,
    totalStudyMinutes: currentStats.totalStudyMinutes + sessionSummary.duration,
    weeklyStudyMinutes: isNewDay ? sessionSummary.duration : currentStats.weeklyStudyMinutes + sessionSummary.duration,
    lastStudyDate: today
  };
};

const getUserStudyStats = async (userId: string): Promise<UserStudyStats> => {
  const cacheKey = `stats-${userId}`;
  const cachedStats = studyStatsCache.get(cacheKey);
  
  if (cachedStats && !studyStatsCache.isStale(cacheKey)) {
    studyStatsCache.touch(cacheKey);
    return cachedStats;
  }

  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  const statsDoc = await getDoc(statsRef);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    await initializeCounters(userId);
  }

  const [flashcardCount, masteredCount] = await Promise.all([
    getTotalCardsCount(userId),
    getMasteryCount(userId)
  ]);

  const defaultStats: UserStudyStats = {
    lastStudied: new Date(),
    streak: 0,
    totalCards: flashcardCount.totalCards,
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
    weekStart: weekStart,
    createdAt: new Date(),
    totalStudyDays: 0
  };

  if (!statsDoc.exists()) {
    const totalStats = await getTotalCardsCount(userId);
    const masteredCount = await getMasteryCount(userId);
    
    await setDoc(statsRef, {
      ...defaultStats,
      totalCards: totalStats.totalCards,
      masteredCards: masteredCount,
      createdAt: new Date(),
      weekStart: weekStart
    });
    
    return defaultStats;
  }

  const data = statsDoc.data();
  
  const stats: UserStudyStats = {
    ...defaultStats,
    lastStudied: data.lastStudied?.toDate() || new Date(),
    streak: Number(data.streak || 0),
    totalCards: flashcardCount.totalCards,
    masteredCards: masteredCount,
    averageAccuracy: Number(data.averageAccuracy || 0),
    totalStudyMinutes: Number(data.totalStudyMinutes || 0),
    weeklyStudyMinutes: Number(data.weeklyStudyMinutes || 0),
    weeklyStudyGoal: Number(data.weeklyStudyGoal || 60),
    totalStudySessions: Number(data.totalStudySessions || 0),
    todayStudyMinutes: Number(data.todayStudyMinutes || 0),
    studyMinutes: Number(data.studyMinutes || 0),
    lastStudyDate: data.lastStudyDate || new Date().toISOString().split('T')[0],
    weekStart: data.weekStart?.toDate() || weekStart,
    createdAt: data.createdAt?.toDate() || new Date(),
    totalStudyDays: Number(data.totalStudyDays || 0)
  };

  const currentWeekStart = new Date();
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

  if (stats.weekStart < currentWeekStart) {
    await updateDoc(statsRef, {
      weeklyStudyMinutes: 0,
      weekStart: currentWeekStart
    });
    stats.weeklyStudyMinutes = 0;
    stats.weekStart = currentWeekStart;
  }

  studyStatsCache.set(cacheKey, stats, false);
  return stats;
};

const updateDailyStreak = async (userId: string) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'study');
  
  return runTransaction(db, async (transaction) => {
    const statsDoc = await transaction.get(statsRef);
    const today = new Date().toISOString().split('T')[0];
    
    if (!statsDoc.exists()) {
      return transaction.set(statsRef, {
        streak: 1,
        lastStudyDate: today
      });
    }

    const data = statsDoc.data();
    const lastStudyDate = data.lastStudyDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = data.streak;
    if (lastStudyDate === yesterdayStr) {
      newStreak++;
    } else if (lastStudyDate !== today) {
      newStreak = 1;
    }

    return transaction.update(statsRef, {
      streak: newStreak,
      lastStudyDate: today
    });
  });
};

const getActualStudyDays = async (userId: string): Promise<number> => {
  try {
    const sessionsRef = collection(db, 'users', userId, 'studySessions');
    const sessionsSnap = await getDocs(sessionsRef);
    
    const uniqueDays = new Set();
    sessionsSnap.forEach(doc => {
      const date = doc.data().date.toDate().toISOString().split('T')[0];
      uniqueDays.add(date);
    });
    
    return uniqueDays.size;
  } catch (error) {
    console.error('Error calculating study days:', error);
    return 0;
  }
};

export const updateUserStudyStats = async (userId: string, stats: Partial<UserStudyStats>): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'stats', 'study');
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();

  const updatedStats = {
    ...(data || {}),
    ...stats,
    updatedAt: new Date()
  };

  await setDoc(docRef, updatedStats, { merge: true });
};

const calculateNewAverage = (currentAvg: number, totalSessions: number, newValue: number): number => {
  return ((currentAvg * totalSessions) + newValue) / (totalSessions + 1);
};

const getWeekStart = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
};

const getTotalCardsCount = async (userId: string) => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const studiedQuery = query(
    collection(db, 'users', userId, 'flashcards'),
    where('lastReviewed', '!=', null)
  );

  const [counterDoc, studiedDocs] = await Promise.all([
    getDoc(counterRef),
    getCountFromServer(studiedQuery)
  ]);

  const totalCards = counterDoc.exists() ? counterDoc.data().count : 0;
  const studiedCards = studiedDocs.data().count;

  return {
    totalCards,
    remainingCards: totalCards - studiedCards,
    studiedCards
  };
};

const getMasteryCount = async (userId: string): Promise<number> => {
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const reviewQuery = await getCountFromServer(
    query(
      flashcardsRef,
      where('state', '==', 'REVIEW'),
      where('difficulty', '<=', 2)
    )
  );
  
  return reviewQuery.data().count;
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
    englishDefinition: doc.data().englishDefinition || '',
    chineseTranslation: doc.data().chineseTranslation || '',
    partOfSpeech: doc.data().partOfSpeech,
    categories: doc.data().categories || [],
    createdAt: doc.data().createdAt,
    lastReviewed: doc.data().lastReviewed,
    nextReview: doc.data().nextReview,
    difficulty: doc.data().difficulty
  }));
};

export const deleteWorksheet = async (userId: string, worksheetId: string) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await deleteDoc(worksheetRef);
    await updateCollectionCounter(userId, 'worksheets', -1);
    worksheetCache.delete(`worksheet-${userId}-${worksheetId}`);
    userWorksheetCache.delete(`worksheets-${userId}`);
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
  const cachedWorksheet = worksheetCache.get(`worksheet-${userId}-${worksheetId}`);
  if (cachedWorksheet) return cachedWorksheet;

  try {
    const docRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    const worksheet = {
      id: docSnap.id,
      title: data.title || 'Untitled Worksheet',
      description: data.description || '',
      questions: data.questions ? shuffleArray(data.questions) : [],
      content: data.content || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      userId: data.userId,
      type: data.type || 'general',
      difficulty: data.difficulty || 'medium', 
      timeLimit: data.timeLimit || 0,
      templateId: data.templateId || '',
      words: data.words || [],
      categories: data.categories || [],
      stats: {
        completed: 0,
        accuracy: 0,
        lastAttempted: data.stats?.lastAttempted?.toDate() || null,
        ...data.stats,
        total: data.questions?.length || data.stats?.total || 0
      }
    } as Worksheet;

    worksheetCache.set(`worksheet-${userId}-${worksheetId}`, worksheet);
    return worksheet;
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
    worksheetCache.delete(`worksheet-${userId}-${worksheetId}`);
    userWorksheetCache.delete(`worksheets-${userId}`);
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
    return await runTransaction(db, async (transaction) => {
      const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
      const worksheetDoc = await transaction.get(worksheetRef);

      if (!worksheetDoc.exists()) {
        throw new Error('Worksheet not found');
      }

      transaction.update(worksheetRef, { 
        stats: {
          ...stats,
          lastAttempted: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      worksheetCache.delete(`worksheet-${userId}-${worksheetId}`);
      userWorksheetCache.delete(`worksheets-${userId}`);
    });
  } catch (error) {
    console.error('Error updating worksheet progress:', error);
    throw error;
  }
};

export const updateFlashcard = async (userId: string, cardId: string, updates: Partial<Flashcard>): Promise<void> => {
  const cardRef = doc(db, 'users', userId, 'flashcards', cardId);
  const batch = writeBatch(db);
  
  try {
    batch.update(cardRef, {
      ...updates,
      updatedAt: new Date()
    });

    if (updates.categories) {
      const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
      const counterDoc = await getDoc(counterRef);
      const currentData = counterDoc.data();
      
      if (currentData?.categories) {
        const currentCategories = currentData.categories as Record<string, number>;
        const newCategories = Array.isArray(updates.categories) 
          ? updates.categories.reduce((acc, cat) => ({...acc, [cat]: (acc[cat] || 0) + 1}), {})
          : updates.categories;

        batch.update(counterRef, {
          categories: newCategories,
          lastUpdated: new Date()
        });
      }
    }

    await batch.commit();
    flashcardCache.delete(`flashcards-${userId}`);
    studyStatsCache.delete(`stats-${userId}`);
  } catch (error) {
    console.error('Error updating flashcard:', error);
    throw error;
  }
};

export const deleteFlashcard = async (userId: string, cardId: string, categories?: string[]) => {
  const batch = writeBatch(db);
  
  try {
    const cardRef = doc(db, 'users', userId, 'flashcards', cardId);
    batch.delete(cardRef);

    const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    
    const updates: any = {
      count: increment(-1),
      items: arrayRemove(cardId),
      lastUpdated: new Date(),
      [`indexMap.${cardId}`]: deleteField(),
    };

    if (categories) {
      categories.forEach(category => {
        updates[`categories.${category}`] = increment(-1);
      });
    }

    batch.update(counterRef, updates);
    await batch.commit();
    
    flashcardCache.delete(`flashcards-${userId}`);
    studyStatsCache.delete(`stats-${userId}`);
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    throw error;
  }
};

export const initializeCounters = async (userId: string) => {
  const collections = ['flashcards', 'worksheets', 'vocabulary', 'categories']; 
  
  for (const collectionName of collections) {
    const query = collection(db, 'users', userId, collectionName);
    const count = await getCountFromServer(query);
    
    await setDoc(doc(db, 'users', userId, 'counters', collectionName), {
      count: count.data().count,
      lastUpdated: new Date()
    });
  }
};

const getCollectionCount = async (userId: string, collectionName: string): Promise<number> => {
  const counterRef = doc(db, 'users', userId, 'counters', collectionName);
  const counterDoc = await getDoc(counterRef);
  return counterDoc.exists() ? counterDoc.data().count : 0;
};


export const saveStudyProgress = async (userId: string, cardProgress: StudyCardProgress) => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const MAX_RETRIES = 5;
  let retryCount = 0;
  
  const saveWithRetry = async (): Promise<void> => {
    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          throw new Error('Counter document not found');
        }
        
        const metadata = counterDoc.data()?.metadata || {};
        let queue = [...(metadata.studyQueue || [])];
        
        const cardIndex = queue.findIndex((item: StudyQueue) => item.cardId === cardProgress.cardId);
        if (cardIndex === -1) return;

        const currentItem = queue[cardIndex];

        queue = queue.filter((item: StudyQueue) => item.cardId !== cardProgress.cardId);

        const nextReviewDate = cardProgress.nextReview || new Date(Date.now() + 24 * 60 * 60 * 1000);

        const queueItem: StudyQueue = {
          cardId: cardProgress.cardId,
          nextReview: nextReviewDate,
          state: cardProgress.state || currentItem.state || 'NEW',
          interval: cardProgress.interval || 0,
          easeFactor: cardProgress.easeFactor || DEFAULT_CONFIG.startingEase,
          position: currentItem.position || 0,
          nextPosition: currentItem.nextPosition || 0,
          srsType: currentItem.srsType || 'interval',
          performance: currentItem.performance || {
            totalAttempts: 0,
            correctAttempts: 0,
            lastAttempts: [],
            averageInterval: 0,
            streakCount: 0
          },
          lastReviewed: new Date() 
        };

        queue.push(queueItem);
        
        queue = sortStudyQueueWithPerformance(queue);
        queue = cleanupQueue(queue);

        const sanitizedQueue = queue.map(item => ({
          ...item,
          nextReview: item.nextReview || new Date(),
          state: item.state || 'NEW',
          interval: item.interval || 0,
          easeFactor: item.easeFactor || DEFAULT_CONFIG.startingEase,
          position: item.position || 0,
          nextPosition: item.nextPosition || 0,
          srsType: item.srsType || 'interval',
          lastReviewed: item.lastReviewed || new Date(),
          performance: item.performance || {
            totalAttempts: 0,
            correctAttempts: 0,
            lastAttempts: [],
            averageInterval: 0,
            streakCount: 0
          }
        }));

        transaction.update(counterRef, {
          'metadata.studyQueue': sanitizedQueue,
          'metadata.queueLastUpdated': new Date()
        });
      });
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return saveWithRetry();
      }
      console.error('Error saving study progress:', error);
      throw error;
    }
  };

  await saveWithRetry();
};

export const restoreStudyQueue = async (userId: string): Promise<StudyQueue[]> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) return [];
  
  const queue = counterDoc.data()?.metadata?.studyQueue || [];
  return queue;
};

export const loadStudyProgress = async (userId: string): Promise<StudyProgress | null> => {
  try {
    const progressDoc = await getDoc(doc(db, 'users', userId, 'studyProgress', 'current'));
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      return {
        currentIndex: data.currentIndex || 0,
        stats: {
          correct: data.correct || 0,
          incorrect: data.incorrect || 0,
          streak: data.streak || 0,
          cardsReviewed: data.cardsReviewed || [],
          timeSpent: data.timeSpent || 0
        },
        mode: data.mode || 'flashcard',
        cards: data.cards || [],
        sessionStart: data.sessionStart?.toDate() || new Date(),
        savedAt: data.savedAt?.toDate() || new Date()
      } as StudyProgress;
    }
    return null;
  } catch (error) {
    console.error('Error loading study progress:', error);
    throw error;
  }
};

export const clearStudyProgress = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'studyProgress', 'current'));
  } catch (error) {
    console.error('Error clearing study progress:', error);
    throw error;
  }
};

export const getFlashcardCount = async (userId: string): Promise<FlashcardCounter> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    await initializeFlashcardCounter(userId);
    return {
      count: 0,
      items: [],
      lastUpdated: new Date(),
      categories: {},
      indexMap: {},
      metadata: {
        totalMastered: 0,
        lastStudied: null,
        averageAccuracy: 0,
        reviewsDue: 0,
        categoriesCount: 0,
        vocabList: [],
        progressStats: {
          new: 0,
          learning: 0,
          review: 0,
          relearn: 0
        },
        studyQueue: [],
        queueLastUpdated: new Date()
      }
    };
  }
  
  return counterDoc.data() as FlashcardCounter;
};

export const getFlashcardMetadata = async (userId: string): Promise<FlashcardCounter> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    const defaultCounter: FlashcardCounter = {
      count: 0,
      items: [],
      categories: {},
      indexMap: {},
      lastUpdated: new Date(),
      metadata: {
        totalMastered: 0,
        lastStudied: null,
        averageAccuracy: 0,
        reviewsDue: 0,
        categoriesCount: 0,
        vocabList: [],
        progressStats: {
          new: 0,
          learning: 0,
          review: 0,
          relearn: 0
        },
        studyQueue: [],
        queueLastUpdated: new Date()
      }
    };

    await setDoc(counterRef, defaultCounter);
    return defaultCounter;
  }

  const data = counterDoc.data();
  const now = new Date();

  const metadata = data.metadata || {};
  
  if (metadata.vocabList) {
    metadata.vocabList = metadata.vocabList.map((item: any) => ({
      ...item,
      lastReviewed: item.lastReviewed?.toDate() || null,
      nextReview: item.nextReview?.toDate() || now
    }));
  }

  return {
    count: data.count || 0,
    items: data.items || [],
    categories: data.categories || {},
    indexMap: data.indexMap || {},
    lastUpdated: data.lastUpdated?.toDate() || now,
    metadata: {
      ...metadata,
      queueLastUpdated: metadata.queueLastUpdated?.toDate() || now,
      lastStudied: metadata.lastStudied?.toDate() || null
    }
  };
};

export const saveFillInBlanksPreference = async (userId: string, useWordAsQuestion: boolean) => {
  try {
    const userPrefsRef = doc(db, 'users', userId, 'preferences', 'study');
    await setDoc(userPrefsRef, {
      fillInBlanksUseWord: useWordAsQuestion
    }, { merge: true });
  } catch (error) {
    console.error('Error saving fill in blanks preference:', error);
    throw error;
  }
};

export const getFillInBlanksPreference = async (userId: string): Promise<boolean> => {
  try {
    const userPrefsRef = doc(db, 'users', userId, 'preferences', 'study');
    const prefs = await getDoc(userPrefsRef);
    return prefs.exists() ? prefs.data().fillInBlanksUseWord ?? false : false;
  } catch (error) {
    console.error('Error getting fill in blanks preference:', error);
    return false;
  }
};

export const searchFlashcards = async (
  userId: string,
  query: string,
  filters: SearchMetadata['filters']
): Promise<FlashcardMetadata[]> => {
  const counter = await getFlashcardMetadata(userId);
  
  const flashcardItems = counter.items.map(item => ({
    id: item.id,
    word: item.word,
    categories: item.categories || [],
    nextReview: counter.metadata.studyQueue?.find(q => q.cardId === item.id)?.nextReview || new Date(),
    difficulty: 0, 
    state: counter.metadata.studyQueue?.find(q => q.cardId === item.id)?.state || 'NEW',
  }));
  
  return flashcardItems.filter(card => {
    if (query && !card.word.toLowerCase().includes(query.toLowerCase())) return false;
    if (filters.categories?.length && (!Array.isArray(card.categories) || !filters.categories.some(c => Array.isArray(card.categories) && card.categories.includes(c)))) return false;
    if (filters.difficulty !== undefined && card.difficulty !== filters.difficulty) return false;
    if (filters.mastered !== undefined) {
      const isReview = card.state === 'REVIEW';
      if (filters.mastered !== isReview) return false;
    }
    if (filters.dueOnly && card.nextReview > new Date()) return false;
    return true;
  });
};

export { 
  getUserStudyStats,
  updateDailyStreak, 
  getTotalCardsCount,
  getMasteryCount
};

export const migrateFillInBlanks = async (userId: string) => {
  const batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.exampleSentence) {
      batch.update(doc.ref, {
        exampleSentence: null
      });
    }
  });

  await batch.commit();
};


// Core comment: Primary SRS queue management
export const updateStudyQueue = async (
  userId: string, 
  cardId: string, 
  review: ReviewResult
) => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  let retryCount = 0;
  
  const saveWithRetry = async (): Promise<void> => {
    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          throw new Error('Counter document not found');
        }

        const metadata = counterDoc.data()?.metadata || {};
        let queue = metadata.studyQueue || [];
        
        const cardIndex = queue.findIndex((item: StudyQueue) => item.cardId === cardId);
        if (cardIndex === -1) return;

        const existingItem = queue.find((item: StudyQueue) => item.cardId === cardId);
        
        queue = queue.filter((item: StudyQueue) => item.cardId !== cardId);
        
        const queueItem: StudyQueue = {
          cardId,
          state: review.state,
          interval: review.interval,
          easeFactor: review.easeFactor,
          nextReview: review.nextReview,
          lastReviewed: new Date(),
          position: existingItem?.position || 0,
          nextPosition: existingItem?.nextPosition || 0,
          srsType: existingItem?.srsType || 'interval', 
          performance: calculateQueuePerformance({
            cardId,
            state: review.state,
            interval: review.interval,
            easeFactor: review.easeFactor,
            nextReview: review.nextReview,
            position: existingItem?.position || 0,
            nextPosition: existingItem?.nextPosition || 0,
            srsType: existingItem?.srsType || 'interval',
            performance: existingItem?.performance || []
          }, review)
        };

        const newPosition = calculateNewQueuePositionWithPerformance(queue, queueItem, review);
        queue.splice(newPosition, 0, queueItem);

        const validation = validateQueue(queue);
        if (!validation.isValid) {
          queue = cleanupQueue(queue);
        }

        transaction.update(counterRef, {
          'metadata.studyQueue': queue,
          'metadata.queueLastUpdated': new Date()
        });
      });
    } catch (error) {
      if (retryCount < 3) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return saveWithRetry();
      }
      throw error;
    }
  };

  await saveWithRetry();
};

const calculateIntervalWithBackoff = (
  queueItem: StudyQueue, 
  review: ReviewResult
): number => {
  const performance = queueItem.performance;
  const failureRate = performance
    ? (performance.totalAttempts - performance.correctAttempts) / performance.totalAttempts
    : 0;
  
  if (failureRate > 0.3) {
    const backoffFactor = Math.min(1 + failureRate, 2);
    return Math.ceil(review.interval * backoffFactor);
  }
  
  return review.interval;
};

const calculateQueueStats = (queue: StudyQueue[]) => {
  const stats = {
    stateDistribution: {
      new: 0,
      learning: 0,
      review: 0,
      relearn: 0
    },
    performanceMetrics: {
      averageSuccessRate: 0,
      totalReviews: 0,
      averageInterval: 0
    },
    lastOptimized: new Date()
  };

  let totalSuccessRate = 0;
  let totalInterval = 0;
  let reviewCount = 0;

  queue.forEach(item => {
    stats.stateDistribution[item.state.toLowerCase() as 'new' | 'learning' | 'review' | 'relearn']++;

    if (item.performance) {
      const successRate = item.performance.correctAttempts / item.performance.totalAttempts;
      totalSuccessRate += successRate;
      totalInterval += item.performance.averageInterval;
      reviewCount++;
    }
  });

  if (reviewCount > 0) {
    stats.performanceMetrics = {
      averageSuccessRate: totalSuccessRate / reviewCount,
      totalReviews: reviewCount,
      averageInterval: totalInterval / reviewCount
    };
  }

  return stats;
};

const calculateQueuePerformance = (
  queueItem: StudyQueue,
  review: ReviewResult
): QueueItemPerformance => {
  const currentPerformance = queueItem.performance || {
    totalAttempts: 0,
    correctAttempts: 0,
    lastAttempts: [],
    averageInterval: 0,
    streakCount: 0
  };

  const success = (review.rating ?? 0) >= 3;
  const lastAttempt = {
    timestamp: new Date(),
    success
  };

  const lastAttempts = [lastAttempt, ...currentPerformance.lastAttempts].slice(0, 5);
  
  const streakCount = success 
    ? currentPerformance.streakCount + 1
    : 0;

  const totalIntervals = currentPerformance.averageInterval * currentPerformance.totalAttempts;
  const newAverageInterval = (totalIntervals + review.interval) / (currentPerformance.totalAttempts + 1);

  return {
    totalAttempts: currentPerformance.totalAttempts + 1,
    correctAttempts: currentPerformance.correctAttempts + (success ? 1 : 0),
    lastAttempts,
    averageInterval: newAverageInterval,
    streakCount
  };
};

const findLastIndexByState = (queue: StudyQueue[], state: string): number => {
  for (let i = queue.length - 1; i > 0; i--) {
    if (queue[i].state === state) return i;
  }
  return -1;
};

const findFirstIndexByState = (queue: StudyQueue[], state: string): number => {
  const index = queue.findIndex(item => item.state === state);
  return index === -1 ? queue.length : index;
};

const findPositionByDueDate = (queue: StudyQueue[], dueDate: Date): number => {
  return queue.findIndex(item => item.nextReview > dueDate);
};

export const getStudyQueue = async (userId: string): Promise<StudyQueue[]> => {
  try {
    const restoredQueue = await restoreQueueState(userId);
    if (restoredQueue.length > 0) {
      return restoredQueue;
    }
    
    const counterDoc = await getDoc(doc(db, 'users', userId, 'counters', 'flashcards'));
    const queue = counterDoc.data()?.metadata?.studyQueue || [];
    
    const now = new Date();
    return queue
      .filter((item: StudyQueue) => {
        if (item.state === 'REVIEW') {
          return item.nextReview <= now;
        }
        return true;
      })
      .sort((a: StudyQueue, b: StudyQueue) => {
        if (a.state === 'RELEARN' && b.state !== 'RELEARN') return -1;
        if (b.state === 'RELEARN' && a.state !== 'RELEARN') return 1;

        if (a.state === 'LEARNING' && b.state !== 'LEARNING') return -1;
        if (b.state === 'LEARNING' && a.state !== 'LEARNING') return 1;

        if (a.state === 'LEARNING' && b.state === 'LEARNING') {
          return (a.position || 0) - (b.position || 0);
        }

        const aOverdue = a.state === 'REVIEW' && a.nextReview < now;
        const bOverdue = b.state === 'REVIEW' && a.nextReview < now;
        if (aOverdue && !bOverdue) return -1;
        if (bOverdue && !aOverdue) return 1;
        
        if (aOverdue && bOverdue) {
          return a.nextReview.getTime() - b.nextReview.getTime();
        }

        if (a.state === 'REVIEW' && b.state === 'REVIEW') {
          return a.nextReview.getTime() - b.nextReview.getTime();
        }

        if (a.state === 'NEW' && b.state !== 'NEW') return -1;
        if (b.state === 'NEW' && a.state !== 'NEW') return 1;

        return (a.position || 0) - (b.position || 0);
      });
  } catch (error) {
    console.error('Error getting study queue:', error);
    return [];
  }
};

export const getFlashcardsForStudy = async (userId: string, limit: number = 20): Promise<FlashcardMetadata[]> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) return [];

  const queue = counterDoc.data()?.metadata?.studyQueue || [];
  return queue
    .slice(0, limit)
    .map((item: any) => ({
      id: item.cardId,
      position: item.position,
      state: item.state,
      nextReview: item.nextReview
    }));
};

export const getMinimalCardData = async (userId: string, cardIds: string[]): Promise<Record<string, FlashcardMetadata>> => {
  const cacheKey = `minimal-cards-${userId}-${cardIds.join(',')}`;
  const cached = flashcardCache.get(cacheKey);
  if (cached) return cached;

  const chunks = [];
  for (let i = 0; i < cardIds.length; i += 10) {
    chunks.push(cardIds.slice(i, i + 10));
  }

  const cards = await Promise.all(
    chunks.map(async chunk => {
      const q = query(
        collection(db, 'users', userId, 'flashcards'),
        where(documentId(), 'in', chunk)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        word: doc.data().word,
        categories: doc.data().categories || []
      } as FlashcardMetadata)); 
    })
  );

  const result = cards.flat().reduce((acc: Record<string, FlashcardMetadata>, card) => {
    acc[card.id] = card;
    return acc;
  }, {});

  flashcardCache.set(cacheKey, result);
  return result;
};

export const performQueueMaintenance = async (userId: string): Promise<void> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  
  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let queue = counterDoc.data()?.metadata?.studyQueue || [];
      
      queue = cleanupQueue(queue);
      
      const validation = validateQueue(queue);
      if (!validation.isValid) {
        logger.warn('Queue validation failed:', validation.errors);
        queue = cleanupQueue(queue);
      }
      
      queue = rebalanceQueue(queue);
      
      transaction.update(counterRef, {
        'metadata.studyQueue': queue,
        'metadata.queueLastUpdated': new Date(),
        'metadata.queueStats': calculateQueueStats(queue),
        'metadata.lastMaintenance': new Date()
      });
    });
  } catch (error) {
    console.error('Error performing queue maintenance:', error);
    throw error;
  }
};
