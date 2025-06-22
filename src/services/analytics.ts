import { db } from './firebase';
import { 
  getFirestore,
  collection as firestoreCollection,
  query as firestoreQuery,
  where as firestoreWhere,
  getDocs,
  orderBy,
  Timestamp,
  limit,
  addDoc 
} from 'firebase/firestore';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import type { StudyAnalytics } from '../types/analytics';
import { analyticsCache, flashcardCache } from '../utils/Cache';

export async function getUserAnalytics(userId: string): Promise<StudyAnalytics> {
  const cacheKey = `analytics_${userId}`;
  const cachedData = analyticsCache.get(cacheKey);
  if (cachedData) return cachedData;

  const cachedCards = flashcardCache.get(`flashcards_${userId}`);
  
  const [sessionsData, flashcardsData] = await Promise.all([
    getStudySessions(userId),
    cachedCards || getFlashcardsData(userId)
  ]);

  const analytics = processAnalyticsData(sessionsData, flashcardsData);
  
  analyticsCache.set(cacheKey, analytics, true);
  if (!cachedCards) {
    flashcardCache.set(`flashcards_${userId}`, flashcardsData, true);
  }

  return analytics;
}

async function getStudySessions(userId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sessionsQuery = firestoreQuery(
    firestoreCollection(db, 'users', userId, 'studySessions'),
    firestoreWhere('date', '>=', Timestamp.fromDate(thirtyDaysAgo)),
    orderBy('date', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(sessionsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function getFlashcardsData(userId: string) {
  const snapshot = await getDocs(firestoreCollection(db, 'users', userId, 'flashcards'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

function processAnalyticsData(sessions: any[], flashcards: any[]): StudyAnalytics {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const dailyStudyTime = eachDayOfInterval({
    start: thirtyDaysAgo,
    end: new Date()
  }).map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    minutes: 0
  }));

  let totalStudyTime = 0;
  let totalCardsReviewed = 0;
  let totalCorrect = 0;

  sessions.forEach(data => {
    const date = data.date.toDate();
    const dateStr = format(date, 'yyyy-MM-dd');
    const duration = Math.round(data.duration / 60);

    const dayIndex = dailyStudyTime.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      dailyStudyTime[dayIndex].minutes += duration;
    }

    totalStudyTime += duration;
    totalCardsReviewed += data.cardsReviewed || 0;
    totalCorrect += data.correctAnswers || 0;
  });

  const categoryMap = new Map<string, { count: number; mastered: number }>();
  
  flashcards.forEach(data => {
    const categories = Array.isArray(data.categories) ? data.categories : [];
    
    categories.forEach((category: string) => {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, mastered: 0 });
      }
      const stats = categoryMap.get(category)!;
      stats.count++;
      if (data.difficulty <= 2) {
        stats.mastered++;
      }
    });
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    mastered: stats.mastered,
    progress: (stats.mastered / stats.count) * 100
  }));

  const studyPatterns = Array(7).fill(0).map((_, index) => ({
    day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
    count: 0
  }));

  sessions.forEach(data => {
    const dayIndex = data.date.toDate().getDay();
    studyPatterns[dayIndex].count += data.cardsReviewed || 0;
  });

  const masteryTrend = eachDayOfInterval({
    start: thirtyDaysAgo,
    end: new Date()
  }).map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    mastered: 0
  }));

  const getDateString = (timestamp: any): string => {
    if (!timestamp) return '';
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return format(timestamp.toDate(), 'yyyy-MM-dd');
    } else if (timestamp instanceof Date) {
      return format(timestamp, 'yyyy-MM-dd');
    } else if (typeof timestamp === 'string') {
      return format(new Date(timestamp), 'yyyy-MM-dd');
    }
    return '';
  };

  flashcards.forEach(data => {
    if (!data.categories) return;
    
    if (data.lastReviewed) {
      const dateStr = getDateString(data.lastReviewed);
      if (dateStr) {
        const dayIndex = masteryTrend.findIndex(day => day.date === dateStr);
        if (dayIndex !== -1) {
          masteryTrend[dayIndex].mastered++;
        }
      }
    }
  });

  return {
    totalStudyTime,
    totalCardsReviewed,
    accuracyRate: totalCardsReviewed > 0 ? (totalCorrect / totalCardsReviewed) * 100 : 0,
    dailyStudyTime,
    weeklyProgress: [],
    masteryTrend,
    studyPatterns,
    categoryBreakdown
  };
}

function calculateTotalStudyTime(snapshot: any): number {
  let total = 0;
  snapshot.forEach((doc: any) => {
    total += doc.data().duration || 0;
  });
  return Math.round(total / 60);
}

function calculateTotalCardsReviewed(snapshot: any): number {
  let total = 0;
  snapshot.forEach((doc: any) => {
    total += doc.data().cardsReviewed || 0;
  });
  return total;
}

function calculateAccuracyRate(snapshot: any): number {
  let totalCards = 0;
  let correctCards = 0;
  snapshot.forEach((doc: any) => {
    const data = doc.data();
    totalCards += data.cardsReviewed || 0;
    correctCards += data.correctAnswers || 0;
  });
  return totalCards > 0 ? (correctCards / totalCards) * 100 : 0;
}

import { StudyPatternAnalysis } from '../types/flashcard';
import { FlashcardReviewLog, StudyQueue } from '../types';
import { calculateRetentionRate } from '../utils/analytics-utils';

export const trackReviewPerformance = async (
  userId: string,
  cardId: string,
  reviewLog: FlashcardReviewLog
): Promise<void> => {
  const reviewsRef = firestoreCollection(db, 'users', userId, 'reviewLogs');
  await addDoc(reviewsRef, {
    ...reviewLog,
    timestamp: new Date()
  });
};

export const analyzeStudyPatterns = async (
  userId: string,
  days: number = 30
): Promise<StudyPatternAnalysis> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logsRef = firestoreCollection(db, 'users', userId, 'reviewLogs');
  const q = firestoreQuery(
    logsRef,
    firestoreWhere('timestamp', '>=', startDate),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map(doc => doc.data());

  const patterns: StudyPatternAnalysis = {
    timeOfDayDistribution: {},
    accuracyByTimeOfDay: {},
    averageResponseTimes: {},
    retentionRates: {
      day1: 0,
      day7: 0,
      day30: 0
    },
    learningCurve: {
      intervals: [],
      accuracyRates: [],
      retentionScores: [],
      reviewCounts: []
    }
  };

  return patterns;
};

export const trackStudySession = async (userId: string, sessionData: {
  duration: number;
  cardsReviewed: number;
  accuracy: number;
  cardIds: string[];
}): Promise<void> => {
  const sessionsRef = firestoreCollection(db, 'users', userId, 'studySessions');
  await addDoc(sessionsRef, {
    ...sessionData,
    timestamp: new Date()
  });
};

export const calculateRetentionStats = async (
  userId: string,
  cardIds: string[]
): Promise<Record<string, number>> => {
  const now = new Date();
  const retentionMap: Record<string, number> = {};

  const reviewLogs = await Promise.all(
    cardIds.map(async cardId => {
      const q = firestoreQuery(
        firestoreCollection(db, 'users', userId, 'reviewLogs'),
        firestoreWhere('cardId', '==', cardId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      return getDocs(q);
    })
  );

  reviewLogs.forEach((logs, index) => {
    const cardId = cardIds[index];
    const reviews = logs.docs.map(doc => doc.data());
    const retention = calculateRetentionRate(reviews as FlashcardReviewLog[]);
    retentionMap[cardId] = retention;
  });

  return retentionMap;
};