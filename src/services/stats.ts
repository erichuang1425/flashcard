import { db } from './firebase';
import {
  doc, runTransaction, increment, getDoc, setDoc,
} from 'firebase/firestore';
import { StudySessionSummary, StudyStats } from '../types';
import { isoDate, previousIsoDate, nextStreak, updateRunningAverage } from '../utils/study-stats';
import {
  getUserFlashcards, getTotalCardsCount, getMasteryCount, getDueCardsCount,
} from './cards';

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

      // Note: `lastStudyDate` is deliberately NOT advanced here. The daily
      // streak is owned by updateDailyStreak, which runs immediately after this
      // and needs to see the *prior* study day to decide whether the streak
      // continues. Stamping today here first made nextStreak always read
      // "already studied today" and froze every streak at 1.
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

export interface DashboardStats {
  totalCards: number;
  studiedCards: number;
  remainingCards: number;
  dueToday: number;
  mastered: number;
  streak: number;
  averageAccuracy: number;
  studyMinutes: number;
  weeklyProgress: number;
  weeklyGoal: number;
  totalStudySessions: number;
}

/**
 * Everything the Home dashboard needs, assembled from the persisted study-stats
 * document plus a handful of O(1) count aggregations. This replaces the old
 * full-deck `getUserFlashcards` read on Home — the single biggest source of
 * Firestore read amplification — with a constant number of reads independent of
 * how large the user's library grows.
 */
export const getDashboardStats = async (userId: string): Promise<DashboardStats> => {
  const [counts, mastered, dueToday, studyStats] = await Promise.all([
    getTotalCardsCount(userId),
    getMasteryCount(userId),
    getDueCardsCount(userId),
    getUserStudyStats(userId),
  ]);

  return {
    totalCards: counts.totalCards,
    studiedCards: counts.studiedCards,
    remainingCards: counts.remainingCards,
    dueToday,
    mastered,
    streak: studyStats.streak,
    averageAccuracy: studyStats.averageAccuracy,
    studyMinutes: studyStats.totalStudyMinutes || studyStats.studyMinutes || 0,
    weeklyProgress: studyStats.weeklyProgress,
    weeklyGoal: studyStats.weeklyStudyGoal,
    totalStudySessions: studyStats.totalStudySessions,
  };
};
