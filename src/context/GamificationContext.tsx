import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getRequiredXP, updateUserXP, loadUserAchievements, checkAndUpdateAchievements } from '../services/gamification';
import type { LevelSystem, Achievement, DailyChallenge } from '../types/gamification';
import { db } from '../services/firebase';
import { onSnapshot, doc, collection, getDocs } from '@firebase/firestore';

interface GamificationContextType {
  levelSystem: LevelSystem | null;
  achievements: Achievement[];
  dailyChallenges: DailyChallenge[];
  addXP: (amount: number) => Promise<void>;
  refreshChallenges: () => Promise<void>;
  showLevelUpNotification: (level: number) => void;
  focusMode: boolean;
  setFocusMode: (active: boolean) => void;
  showGamePanel: boolean;
  setShowGamePanel: (show: boolean) => void;
  toggleGamePanel: () => void;
  showMobileGamePanel: boolean;
  setShowMobileGamePanel: (show: boolean) => void;
  toggleMobileGamePanel: () => void;
}

const GamificationContext = createContext<GamificationContextType | null>({
  levelSystem: null,
  achievements: [],
  dailyChallenges: [],
  addXP: async () => {},
  refreshChallenges: async () => {},
  showLevelUpNotification: () => {},
  focusMode: false,
  setFocusMode: () => {},
  showGamePanel: true,
  setShowGamePanel: () => {},
  toggleGamePanel: () => {},
  showMobileGamePanel: false,
  setShowMobileGamePanel: () => {},
  toggleMobileGamePanel: () => {}
});

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
  const [notifications, setNotifications] = useState<string[]>([]);
  const [levelUpNotification, setLevelUpNotification] = useState<{ level: number; visible: boolean }>({ level: 0, visible: false });
  const [focusMode, setFocusMode] = useState(false);
  const [showGamePanel, setShowGamePanel] = useState(true);
  const [showMobileGamePanel, setShowMobileGamePanel] = useState(false);

  // Track previous level for level-up detection
  const previousLevel = React.useRef(1);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'stats', 'gamification'),
      (doc) => {
        if (doc.exists()) {
          setLevelSystem(doc.data() as LevelSystem);
        }
      }
    );

    const loadAchievements = async () => {
      const userAchievements = await loadUserAchievements(user.uid);
      setAchievements(userAchievements);
    };
    
    loadAchievements();

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (levelSystem && levelSystem.currentLevel > previousLevel.current) {
      showLevelUpNotification(levelSystem.currentLevel);
      previousLevel.current = levelSystem.currentLevel;
    }
  }, [levelSystem]);

  useEffect(() => {
    if (focusMode) {
      document.body.style.filter = 'grayscale(0.5)';
      document.body.style.transition = 'filter 0.3s ease';
    } else {
      document.body.style.filter = 'none';
    }
    return () => {
      document.body.style.filter = 'none';
    };
  }, [focusMode]);

  const checkAchievements = async (stats: any) => {
    if (!user) return;
    
    await checkAndUpdateAchievements(user.uid, {
      studySessions: stats.totalStudySessions || 0,
      cardsMastered: stats.masteredCards || 0,
      studyTime: stats.totalStudyTime || 0,
      averageAccuracy: stats.averageAccuracy || 0,
      perfectSessions: stats.perfectSessions || 0
    });

    // Reload achievements after update
    const updatedAchievements = await loadUserAchievements(user.uid);
    setAchievements(updatedAchievements);
  };

  const showLevelUpNotification = (level: number) => {
    setLevelUpNotification({ level, visible: true });
    setTimeout(() => setLevelUpNotification(prev => ({ ...prev, visible: false })), 3000);
  };

  const toggleGamePanel = () => setShowGamePanel(prev => !prev);
  const toggleMobileGamePanel = () => setShowMobileGamePanel(prev => !prev);

  const value = {
    levelSystem,
    achievements,
    dailyChallenges,
    notifications,
    addXP: async (amount: number) => {
      if (!user) return;
      const newStats = await updateUserXP(user.uid, amount);
      setLevelSystem(newStats);
      await checkAchievements(newStats);
    },
    refreshChallenges: async () => {
      if (!user) return;
      // Implement daily challenges refresh logic
    },
    showLevelUpNotification,
    focusMode,
    setFocusMode,
    showGamePanel,
    setShowGamePanel,
    toggleGamePanel,
    showMobileGamePanel,
    setShowMobileGamePanel, 
    toggleMobileGamePanel
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};