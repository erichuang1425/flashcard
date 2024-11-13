export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    requirement: number;
    type: 'streak' | 'cards_mastered' | 'study_time' | 'accuracy' | 'perfect_sessions';
    tier: 'bronze' | 'silver' | 'gold';
    points: number;
  }
  
  export interface UserAchievement extends Achievement {
    progress: number;
    achieved: boolean;
    achievedDate?: Date;
  }
  
  export interface LevelSystem {
    currentLevel: number;
    currentXP: number;
    requiredXP: number;
    totalXP: number;
  }
  
  export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    type: 'study_time' | 'cards_reviewed' | 'accuracy' | 'specific_category';
    target: number;
    progress: number;
    reward: number;
    expiresAt: Date;
    completed: boolean;
  }
  
  export interface LeaderboardEntry {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    score: number;
    rank?: number;
    weekNumber: number;
  }