import { auth, db } from './firebase';
import { 
  collection, addDoc, getDocs, query, where, orderBy, 
  updateDoc, deleteDoc, doc, writeBatch, startAt, endAt, limit, runTransaction, increment, getDoc, setDoc, startAfter, getCountFromServer, serverTimestamp 
}  from 'firebase/firestore';
import { 
  Flashcard, StudySessionSummary, StudyStats, Worksheet, 
  VocabularyWord, WorksheetStats, VocabularyDefinition, 
  StudyProgress, StudyCardProgress 
} from '../types';
import { flashcardCache, categoryCache, worksheetCache, studyStatsCache, userWorksheetCache, analyticsCache } from '../utils/Cache';
import type { FlashcardsResponse } from '../types/responses';
import { calculateNextReview } from '../utils/spaced-repetition';

interface FlashcardDocument {
  id: string;
  word: string;
  englishDefinition: string;
  partOfSpeech: string;
  categories: string[];
  [key: string]: any; 
}

interface CollectionCounter {
  count: number;
  lastUpdated: Date;
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

export const addFlashcard = async (flashcard: Omit<Flashcard, 'id'>) => {
  const batch = writeBatch(db);
  
  try {

    const flashcardRef = doc(collection(db, 'users', flashcard.userId, 'flashcards'));
    batch.set(flashcardRef, {
      ...flashcard,
      categories: flashcard.categories || [],
      lastReviewed: null,
      nextReview: new Date()
    });


    if (flashcard.categories?.length) {
      const categoryPromises = flashcard.categories.map(async (categoryName) => {
        const encodedId = encodeURIComponent(categoryName.toLowerCase().trim());
        const categoryRef = doc(db, 'categories', encodedId);
        

        try {
          await setDoc(categoryRef, {
            name: categoryName,
            userId: flashcard.userId,
            count: 1,
            createdAt: new Date()
          }, { merge: true });
        } catch (e) {
          await updateDoc(categoryRef, {
            count: increment(1)
          });
        }
        return encodedId;
      });

      await Promise.all(categoryPromises);
    }

    await batch.commit();
    await updateCollectionCounter(flashcard.userId, 'flashcards', 1);

    flashcardCache.delete(`flashcards-${flashcard.userId}`);
    categoryCache.clear();
    return flashcardRef.id;
  } catch (error) {
    console.error('Error adding flashcard:', error);
    throw error;
  }
};

export const batchGetFlashcards = async (userId: string, cardIds: string[]): Promise<Flashcard[]> => {
  const cacheKey = `flashcards_batch_${userId}_${cardIds.sort().join('_')}`;
  const cachedCards = flashcardCache.get(cacheKey);
  if (cachedCards) return cachedCards;

  const cards: Flashcard[] = [];
  for (let i = 0; i < cardIds.length; i += 10) {
    const batch = cardIds.slice(i, i + 10);
    const q = query(
      collection(db, 'users', userId, 'flashcards'),
      where('id', 'in', batch)
    );
    const snapshot = await getDocs(q);
      cards.push(...snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      nextReview: doc.data().nextReview?.toDate(),
      lastReviewed: doc.data().lastReviewed?.toDate(),
      created: doc.data().created?.toDate(),
      userId: doc.data().userId,
      word: doc.data().word,
      partOfSpeech: doc.data().partOfSpeech,
      englishDefinition: doc.data().englishDefinition,
      difficulty: doc.data().difficulty,
      categories: doc.data().categories || []
    } as Flashcard)));
  }

  flashcardCache.set(cacheKey, cards);
  return cards;
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
    
    await updateCollectionCounter(auth.currentUser.uid, 'worksheets', 1);
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

export const getVocabularyWords = async (pageLimit?: number): Promise<VocabularyWord[]> => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'users', auth.currentUser.uid, 'flashcards'),
      orderBy('word'),
      where('isPublic', '==', true)
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

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'flashcards'),
      where('word', '>=', term),
      where('word', '<=', term + '\uf8ff'),
      where('isPublic', '==', true),
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
  let q = query(collection(db, 'vocabulary'));

  if (options.searchTerm) {
    q = query(
      q,
      orderBy('word'),
      startAt(options.searchTerm),
      endAt(options.searchTerm + '\uf8ff')
    );
  }

  if (options.partOfSpeech) {
    q = query(q, where('partOfSpeech', '==', options.partOfSpeech));
  }

  if (options.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (VocabularyWord & { id: string })[];
};

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

export const getVocabularyStats = async () => {
  const vocabRef = collection(db, 'vocabulary');
  const totalQuery = await getCountFromServer(vocabRef);
  
  const stats = {
    total: totalQuery.data().count,
    byPartOfSpeech: {} as Record<string, number>
  };

  const snapshot = await getDocs(vocabRef);
  snapshot.forEach(doc => {
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
  
  return words.sort(() => Math.random() - 0.5).slice(0, count);
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
        const lastStudied = currentStats.lastStudied;
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

export const updateWeeklyStudyGoal = async (userId: string) => {
  try {
    const { cards } = await getUserFlashcards(userId);
    const totalCards = cards.length;
    
    const recommendedWeeklyMinutes = Math.max(60, Math.ceil(totalCards * 0.5));
    
    const statsRef = doc(db, 'studyStats', userId);
    await setDoc(statsRef, {
      weeklyStudyGoal: recommendedWeeklyMinutes
    }, { merge: true });
    
    return recommendedWeeklyMinutes;
  } catch (error) {
    console.error('Error updating weekly study goal:', error);
    throw error;
  }
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
  const masteredQuery = await getCountFromServer(
    query(
      flashcardsRef,
      where('difficulty', '<=', 2),
      where('lastReviewed', '!=', null)
    )
  );
  
  return masteredQuery.data().count;
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
      questions: shuffleArray(data.questions || []),
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
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await updateDoc(worksheetRef, { stats });
    worksheetCache.delete(`worksheet-${userId}-${worksheetId}`);
    userWorksheetCache.delete(`worksheets-${userId}`);
  } catch (error) {
    console.error('Error updating worksheet progress:', error);
    throw error;
  }
};

export const deleteFlashcard = async (userId: string, cardId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'flashcards', cardId));
    await updateCollectionCounter(userId, 'flashcards', -1);
    
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

export const saveStudyProgress = async (
  userId: string,
  progress: StudyCardProgress
) => {
  const batch = writeBatch(db);
  
  try {
    const cardRef = doc(db, 'users', userId, 'flashcards', progress.cardId);
    const cardSnap = await getDoc(cardRef);
    const currentDifficulty = cardSnap.exists() ? cardSnap.data().difficulty : 0;
    const rating = Math.min(Math.max(1, progress.rating), 5) as 1 | 2 | 3 | 4 | 5;
    const { nextReview, newDifficulty } = calculateNextReview(rating, currentDifficulty);
    
    batch.update(cardRef, {
      nextReview,
      difficulty: newDifficulty,
      mastered: progress.rating >= 4,
      lastReviewed: serverTimestamp()
    });

    const statsRef = doc(db, 'users', userId, 'stats', 'study');
    batch.set(statsRef, {
      lastStudied: serverTimestamp(),
      totalCards: increment(1),
      masteredCards: increment(progress.rating >= 4 ? 1 : 0),
      totalStudyMinutes: increment(Math.round(progress.timeSpent / 60000)),
      [`${progress.mode}Completed`]: increment(1),
      [`${progress.mode}Correct`]: increment(progress.isCorrect ? 1 : 0),
      streak: increment(progress.isCorrect ? 1 : 0)
    }, { merge: true });

    await batch.commit();
    
    flashcardCache.clear();
    studyStatsCache.delete(`stats-${userId}`);
  } catch (error) {
    console.error('Error saving study progress:', error);
    throw error;
  }
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

export { 
  getUserStudyStats,
  updateDailyStreak, 
  getTotalCardsCount,
  getMasteryCount
};
