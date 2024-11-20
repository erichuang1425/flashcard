import { db } from './firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

interface ReadingStats {
  totalWordsRead: number;
  articlesCompleted: number;
  averageSpeed: number;
  streak: number;
  focusTime: number;
}

const ACHIEVEMENTS = {
  SPEED_READER: {
    id: 'speed_reader',
    thresholds: [200, 300, 400], // WPM
    points: [50, 100, 200]
  },
  BOOKWORM: {
    id: 'bookworm',
    thresholds: [5, 20, 50], // Articles completed
    points: [100, 300, 500]
  },
  FOCUSED_READER: {
    id: 'focused_reader',
    thresholds: [30, 60, 120], // Minutes in focus mode
    points: [50, 150, 300]
  }
};

export const updateReadingStats = async (userId: string, stats: Partial<ReadingStats>) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'reading');
  
  await updateDoc(statsRef, {
    totalWordsRead: increment(stats.totalWordsRead || 0),
    articlesCompleted: increment(stats.articlesCompleted || 0),
    focusTime: increment(stats.focusTime || 0),
    ...(stats.averageSpeed && { averageSpeed: stats.averageSpeed }),
    lastUpdated: new Date().toISOString()
  });

  return checkAchievements(userId);
};

const checkAchievements = async (userId: string) => {
  const statsDoc = await getDoc(doc(db, 'users', userId, 'stats', 'reading'));
  if (!statsDoc.exists()) return [];

  const stats = statsDoc.data() as ReadingStats;
  const achievements: string[] = [];

  // Check speed reading achievements
  if (stats.averageSpeed >= ACHIEVEMENTS.SPEED_READER.thresholds[0]) {
    achievements.push(ACHIEVEMENTS.SPEED_READER.id);
  }

  // Check article completion achievements
  if (stats.articlesCompleted >= ACHIEVEMENTS.BOOKWORM.thresholds[0]) {
    achievements.push(ACHIEVEMENTS.BOOKWORM.id);
  }

  // Check focus time achievements
  if (stats.focusTime >= ACHIEVEMENTS.FOCUSED_READER.thresholds[0]) {
    achievements.push(ACHIEVEMENTS.FOCUSED_READER.id);
  }

  return achievements;
};