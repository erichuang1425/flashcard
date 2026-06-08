import { db } from '../services/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  setDoc, 
  updateDoc, 
  increment,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import type { Achievement, UserAchievement, DailyChallenge, LeaderboardEntry, LevelSystem } from '../types/gamification';

const LEVELS_CONFIG = {
  BASE_XP: 100,
  GROWTH_FACTOR: 1.5
};

export const getRequiredXP = (level: number): number => {
  return Math.floor(LEVELS_CONFIG.BASE_XP * Math.pow(LEVELS_CONFIG.GROWTH_FACTOR, level - 1));
};

export const updateUserXP = async (userId: string, xpGained: number): Promise<LevelSystem> => {
  const userStatsRef = doc(db, 'users', userId, 'stats', 'gamification');
  
  try {
    // First try to get existing stats
    const statsDoc = await getDoc(userStatsRef);
    
    // Initialize default stats if none exist
    const currentStats: LevelSystem = statsDoc.exists() ? statsDoc.data() as LevelSystem : {
      currentLevel: 1,
      currentXP: 0,
      requiredXP: LEVELS_CONFIG.BASE_XP,
      totalXP: 0
    };

    // Update XP and level
    let { currentLevel, currentXP, requiredXP, totalXP } = currentStats;
    currentXP += xpGained;
    totalXP += xpGained;

    // Level up check
    while (currentXP >= requiredXP) {
      currentXP -= requiredXP;
      currentLevel++;
      requiredXP = getRequiredXP(currentLevel);
    }

    const newStats = {
      currentLevel,
      currentXP,
      requiredXP,
      totalXP
    };

    // Use setDoc with merge option to ensure all fields are properly updated
    await setDoc(userStatsRef, newStats, { merge: true });
    
    return newStats;
  } catch (error) {
    console.error('Error updating XP:', error);
    throw error;
  }
};

// Add achievement types and helpers
type AchievementStats = {
  studySessions: number;
  cardsMastered: number;
  studyTime: number;
  averageAccuracy: number;
  perfectSessions: number;
};

const calculateAchievementProgress = (
  achievement: Achievement, 
  stats: AchievementStats
): number => {
  switch (achievement.type) {
    case 'streak':
      return stats.studySessions;
    case 'cards_mastered':
      return stats.cardsMastered;
    case 'study_time':
      return stats.studyTime;
    case 'accuracy':
      return stats.averageAccuracy;
    case 'perfect_sessions':
      return stats.perfectSessions;
    default:
      return 0;
  }
};

export const loadUserAchievements = async (userId: string): Promise<UserAchievement[]> => {
  const achievementsRef = collection(db, 'users', userId, 'achievements');
  const snapshot = await getDocs(achievementsRef);
  return snapshot.docs.map(doc => doc.data() as UserAchievement);
};

// Add more complete achievement templates
const ACHIEVEMENT_TEMPLATES: Achievement[] = [
  {
    id: 'first-study',
    title: 'First Steps',
    description: 'Complete your first study session',
    icon: '🎯',
    requirement: 1,
    type: 'study_time',
    tier: 'bronze',
    points: 50
  },
  {
    id: 'mastery-beginner',
    title: 'Beginner Master',
    description: 'Master 10 cards',
    icon: '🌟',
    requirement: 10,
    type: 'cards_mastered',
    tier: 'bronze',
    points: 100
  },
  {
    id: 'perfect-streak',
    title: 'Perfect Streak',
    description: 'Get 5 perfect study sessions in a row',
    icon: '🔥',
    requirement: 5,
    type: 'perfect_sessions',
    tier: 'silver',
    points: 200
  }
];

// Replace existing checkAndUpdateAchievements function
export const checkAndUpdateAchievements = async (userId: string, stats: AchievementStats) => {
  const userAchievementsRef = collection(db, 'users', userId, 'achievements');
  
  for (const template of ACHIEVEMENT_TEMPLATES) {
    const achievementRef = doc(userAchievementsRef, template.id);
    const achievementDoc = await getDoc(achievementRef);
    
    const wasAchieved = achievementDoc.exists() && achievementDoc.data().achieved === true;

    if (!wasAchieved) {
      const progress = calculateAchievementProgress(template, stats);
      const nowAchieved = progress >= template.requirement;

      await setDoc(achievementRef, {
        ...template,
        progress,
        achieved: nowAchieved,
        achievedDate: nowAchieved ? new Date() : null
      }, { merge: true });

      // Award XP only on the transition from not-achieved to achieved. The doc
      // may already exist (created earlier with partial progress), so gating on
      // !exists() would never award XP for multi-step achievements.
      if (nowAchieved) {
        await updateUserXP(userId, template.points);
      }
    }
  }
};

// Add more functions for achievements, leaderboard, etc.