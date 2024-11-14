import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { StudyAnalytics } from '../types/analytics';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

export async function getUserAnalytics(userId: string): Promise<StudyAnalytics> {
  const sessionsRef = collection(db, 'users', userId, 'studySessions');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessionsQuery = query(
    sessionsRef,
    where('date', '>=', thirtyDaysAgo),
    orderBy('date', 'desc')
  );

  const sessionsSnapshot = await getDocs(sessionsQuery);

  // Process data for analytics
  const dailyStudyTime: StudyAnalytics['dailyStudyTime'] = [];
  const weeklyProgress: StudyAnalytics['weeklyProgress'] = [];
  const masteryTrend: StudyAnalytics['masteryTrend'] = [];

  // Calculate daily study time
  sessionsSnapshot.forEach(doc => {
    const data = doc.data();
    dailyStudyTime.push({
      date: format(data.date.toDate(), 'yyyy-MM-dd'),
      minutes: data.duration
    });
  });

  // Get category breakdown
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const flashcardsSnapshot = await getDocs(flashcardsRef);

  const categoryMap = new Map<string, { count: number; mastered: number }>();
  const categoryBreakdown: StudyAnalytics['categoryBreakdown'] = [];

  flashcardsSnapshot.forEach(doc => {
    const data = doc.data();
    data.categories?.forEach((category: string) => {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, mastered: 0 });
      }
      const stats = categoryMap.get(category)!;
      stats.count++;
      if (data.difficulty <= 2) stats.mastered++;
    });
  });

  categoryMap.forEach((stats, category) => {
    categoryBreakdown.push({
      category,
      count: stats.count,
      mastered: stats.mastered,
      progress: (stats.mastered / stats.count) * 100
    });
  });

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const studyPatterns = weekdays.map(day => ({
    day,
    count: 0
  }));

  sessionsSnapshot.forEach(doc => {
    const data = doc.data();
    const date = data.date.toDate();
    const dayIndex = date.getDay();
    studyPatterns[dayIndex].count += data.cardsReviewed || 0;
  });

  return {
    totalStudyTime: calculateTotalStudyTime(sessionsSnapshot),
    totalCardsReviewed: calculateTotalCardsReviewed(sessionsSnapshot),
    accuracyRate: calculateAccuracyRate(sessionsSnapshot),
    dailyStudyTime,
    weeklyProgress,
    masteryTrend,
    studyPatterns,
    categoryBreakdown
  };
}

// Add helper functions
function calculateTotalStudyTime(snapshot: any): number {
  return snapshot.docs.reduce((total: number, doc: any) => total + (doc.data().duration || 0), 0);
}

function calculateTotalCardsReviewed(snapshot: any): number {
  return snapshot.docs.reduce((total: number, doc: any) => total + (doc.data().cardsReviewed || 0), 0);
}

function calculateAccuracyRate(snapshot: any): number {
  const total = snapshot.docs.reduce((acc: any, doc: any) => {
    const data = doc.data();
    return {
      correct: acc.correct + (data.correctAnswers || 0),
      total: acc.total + (data.totalAnswers || 0)
    };
  }, { correct: 0, total: 0 });

  return total.total > 0 ? (total.correct / total.total) * 100 : 0;
}