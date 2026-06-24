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
  
  /**
   * One generated challenge for a single local day. The human-readable label is
   * derived in the UI from `type` + `target` (so it stays translatable); only
   * the machine fields are persisted. `progress` is in the same unit as
   * `target` — cards for `cards_reviewed`, minutes for `study_time`, percent for
   * `accuracy`.
   */
  export interface DailyChallenge {
    id: string;
    type: 'cards_reviewed' | 'study_time' | 'accuracy';
    target: number;
    progress: number;
    reward: number;
    completed: boolean;
  }