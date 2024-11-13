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

// Add more functions for achievements, leaderboard, etc.