import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { StudyQueue, QueueItemPerformance } from '../types';
import { logger } from './logging';

interface DayDistribution {
  Sunday: number;
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
  Friday: number;
  Saturday: number;
}

interface StudyTimeAnalysis {
  bestHours: number[];
  averageSessionLength: number;
  recommendedSessionLength: number;
  bestDays: string[];
  consistencyScore: number;
  studyPatterns: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

export const analyzeStudyPatterns = async (userId: string, days: number = 30): Promise<StudyTimeAnalysis> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const analyticsRef = collection(db, 'users', userId, 'studyAnalytics');
    const q = query(
      analyticsRef,
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(doc => doc.data());

    const hourCounts = new Array(24).fill(0);
    const hourSuccess = new Array(24).fill(0);
    const dayDistribution: DayDistribution = {
      'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0,
      'Thursday': 0, 'Friday': 0, 'Saturday': 0
    };

    let totalSessionLength = 0;
    let sessionCount = 0;

    sessions.forEach(session => {
      const timestamp = session.timestamp.toDate();
      const hour = timestamp.getHours();
      const day = timestamp.toLocaleString('en-US', { weekday: 'long' }) as keyof DayDistribution;

      hourCounts[hour]++;
      if (session.performance?.correctAttempts > 0) {
        hourSuccess[hour] += session.performance.correctAttempts / session.performance.totalAttempts;
      }
      dayDistribution[day]++;

      if (session.duration) {
        totalSessionLength += session.duration;
        sessionCount++;
      }
    });

    const bestHours = hourCounts
      .map((count, hour) => ({
        hour,
        score: count > 0 ? (hourSuccess[hour] / count) * count : 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(h => h.hour);

    const bestDays = Object.entries(dayDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    const averageSessionLength = sessionCount > 0 ? totalSessionLength / sessionCount : 25;
    const recommendedSessionLength = Math.min(Math.max(averageSessionLength, 15), 45);

    const studyPatterns = {
      morning: hourCounts.slice(5, 11).reduce((a, b) => a + b, 0),
      afternoon: hourCounts.slice(11, 17).reduce((a, b) => a + b, 0),
      evening: hourCounts.slice(17, 22).reduce((a, b) => a + b, 0),
      night: [...hourCounts.slice(22), ...hourCounts.slice(0, 5)].reduce((a, b) => a + b, 0)
    };

    const totalSessions = Object.values(dayDistribution).reduce((a, b) => a + b, 0);
    const expectedPerDay = totalSessions / 7;
    const variance = Object.values(dayDistribution)
      .reduce((acc, count) => acc + Math.pow(count - expectedPerDay, 2), 0) / 7;
    const consistencyScore = 1 / (1 + Math.sqrt(variance) / expectedPerDay);

    return {
      bestHours,
      averageSessionLength,
      recommendedSessionLength,
      bestDays,
      consistencyScore,
      studyPatterns
    };
  } catch (error) {
    logger.error('Error analyzing study patterns:', error as Error);
    throw error;
  }
};

export const adaptStudySchedule = async (
  userId: string,
  queue: StudyQueue[],
  analysis: StudyTimeAnalysis
): Promise<StudyQueue[]> => {
  return queue.map(item => {
    const nextReview = new Date(item.nextReview);
    const currentHour = nextReview.getHours();

    if (!analysis.bestHours.includes(currentHour)) {
    const bestHour: number = analysis.bestHours.find((h: number): boolean => h > currentHour) || analysis.bestHours[0];
      nextReview.setHours(bestHour, 0, 0, 0);
      return { ...item, nextReview };
    }

    return item;
  });
};

export const getStudySessionRecommendation = async (
  userId: string
): Promise<{ recommendedTime: Date; duration: number }> => {
  const analysis = await analyzeStudyPatterns(userId);
  const now = new Date();
  const currentHour = now.getHours();

  const nextBestHour = analysis.bestHours.find((h: number) => h > currentHour) || analysis.bestHours[0];
  const recommendedTime = new Date();
  recommendedTime.setHours(nextBestHour, 0, 0, 0);

  if (recommendedTime < now) {
    recommendedTime.setDate(recommendedTime.getDate() + 1);
  }

  return {
    recommendedTime,
    duration: analysis.recommendedSessionLength
  };
};