export interface StudyAnalytics {
  totalStudyTime: number;
  totalCardsReviewed: number;
  accuracyRate: number;
  dailyStudyTime: {
    date: string;
    minutes: number;
  }[];
  weeklyProgress: {
    week: string;
    completed: number;
    goal: number;
  }[];
  masteryTrend: {
    date: string;
    mastered: number;
  }[];
  studyPatterns: {
    day: string;
    count: number;
  }[];
  categoryBreakdown: {
    category: string;
    progress: number;
    count: number;
    mastered: number;
  }[];
}