export interface Flashcard {
  // ...existing code...
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  interval: number;
  easeFactor: number;
  lapseCount: number;
  reviews: number;
  lastReviewed: Date | null;
  // ...existing code...
}

export interface FlashcardReviewLog {
  id: string;
  cardId: string;
  userId: string;
  reviewedAt: Date;
  rating: number;
  state: Flashcard['state'];
  interval: number;
  easeFactor: number;
  timeSpent: number;
  reviewType: 'interval' | 'position';
  performance?: {
    responseTime: number;
    accuracy: number;
    reviewTimeOfDay: number; // Hour of day (0-23)
  };
}

export interface StudyPatternAnalysis {
  timeOfDayDistribution: Record<number, number>; // Hour -> count
  accuracyByTimeOfDay: Record<number, number>; // Hour -> accuracy
  averageResponseTimes: Record<string, number>; // State -> avg time
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
  learningCurve: LearningCurveData;
}

export interface LearningCurveData {
  intervals: number[];
  accuracyRates: number[];
  retentionScores: number[];
  reviewCounts: number[];
}