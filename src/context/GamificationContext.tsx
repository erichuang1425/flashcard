import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAuth } from './AuthContext';
import { updateUserXP, loadUserAchievements, checkAndUpdateAchievements } from '../services/gamification';
import { getUserStudyStats } from '../services/firestore';
import type { LevelSystem, Achievement, DailyChallenge } from '../types/gamification';
import { db } from '../services/firebase';
import { onSnapshot, doc } from '@firebase/firestore';

interface GamificationContextType {
  levelSystem: LevelSystem | null;
  achievements: Achievement[];
  dailyChallenges: DailyChallenge[];
  addXP: (amount: number) => Promise<void>;
  /** Re-evaluate achievement progress against the latest study stats. */
  checkAchievements: () => Promise<void>;
  refreshChallenges: () => Promise<void>;
  showLevelUpNotification: (level: number) => void;
  focusMode: boolean;
  setFocusMode: (active: boolean) => void;
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
  const [dailyChallenges] = useState<DailyChallenge[]>([]);
  const [levelUpNotification, setLevelUpNotification] = useState<{ level: number; visible: boolean }>({ level: 0, visible: false });
  const [focusMode, setFocusMode] = useState(false);

  // Track previous level for level-up detection. Starts null so the first
  // snapshot after sign-in (which may already be a high level) doesn't fire
  // a spurious level-up notification.
  const previousLevel = useRef<number | null>(null);
  const notificationTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    previousLevel.current = null;
    let active = true;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'stats', 'gamification'),
      (snapshot) => {
        if (snapshot.exists()) {
          setLevelSystem(snapshot.data() as LevelSystem);
        }
      }
    );

    loadUserAchievements(user.uid)
      .then((userAchievements) => {
        if (active) setAchievements(userAchievements);
      })
      .catch((error) => console.error('Error loading achievements:', error));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const showLevelUpNotification = useCallback((level: number) => {
    setLevelUpNotification({ level, visible: true });
    clearTimeout(notificationTimeout.current);
    notificationTimeout.current = setTimeout(
      () => setLevelUpNotification(prev => ({ ...prev, visible: false })),
      3000
    );
  }, []);

  useEffect(() => () => clearTimeout(notificationTimeout.current), []);

  useEffect(() => {
    if (!levelSystem) return;
    if (previousLevel.current !== null && levelSystem.currentLevel > previousLevel.current) {
      showLevelUpNotification(levelSystem.currentLevel);
    }
    previousLevel.current = levelSystem.currentLevel;
  }, [levelSystem, showLevelUpNotification]);

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

  const checkAchievements = useCallback(async () => {
    if (!user) return;

    // Achievement progress is measured against real study stats, not the XP
    // level system — fetch them fresh so the check sees the latest session.
    const stats = await getUserStudyStats(user.uid);
    await checkAndUpdateAchievements(user.uid, {
      studySessions: stats.totalStudySessions || 0,
      cardsMastered: stats.masteredCards || 0,
      studyTime: stats.totalStudyMinutes || stats.studyMinutes || 0,
      averageAccuracy: stats.averageAccuracy || 0,
      perfectSessions: 0, // not tracked in study stats yet
    });

    const updatedAchievements = await loadUserAchievements(user.uid);
    setAchievements(updatedAchievements);
  }, [user]);

  const addXP = useCallback(async (amount: number) => {
    if (!user) return;
    const newStats = await updateUserXP(user.uid, amount);
    setLevelSystem(newStats);
    await checkAchievements();
  }, [user, checkAchievements]);

  const refreshChallenges = useCallback(async () => {
    if (!user) return;
    // Implement daily challenges refresh logic
  }, [user]);

  const value = useMemo(() => ({
    levelSystem,
    achievements,
    dailyChallenges,
    addXP,
    checkAchievements,
    refreshChallenges,
    showLevelUpNotification,
    focusMode,
    setFocusMode,
  }), [levelSystem, achievements, dailyChallenges, addXP, checkAchievements, refreshChallenges, showLevelUpNotification, focusMode]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={levelUpNotification.visible}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={() => setLevelUpNotification(prev => ({ ...prev, visible: false }))}
      >
        <Alert severity="success" variant="filled" icon={false}>
          🎉 Level up! You reached level {levelUpNotification.level}
        </Alert>
      </Snackbar>
    </GamificationContext.Provider>
  );
};
