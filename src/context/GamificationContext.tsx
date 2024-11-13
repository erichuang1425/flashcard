import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getRequiredXP, updateUserXP } from '../services/gamification';
import type { LevelSystem, Achievement, DailyChallenge } from '../types/gamification';

interface GamificationContextType {
  levelSystem: LevelSystem | null;
  achievements: Achievement[];
  dailyChallenges: DailyChallenge[];
  addXP: (amount: number) => Promise<void>;
  refreshChallenges: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [levelSystem, setLevelSystem] = useState<LevelSystem | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);

  // Add initialization and methods here

  const value = {
    levelSystem,
    achievements,
    dailyChallenges,
    addXP: async (amount: number) => {
      if (!user) return;
      const newStats = await updateUserXP(user.uid, amount);
      setLevelSystem(newStats);
    },
    refreshChallenges: async () => {
      // Implement refresh logic
    }
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};