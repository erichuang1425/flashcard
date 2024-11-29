export interface FlashcardStats {
  reviews: number;
  totalCorrect: number;
  successRate: number;
  mature: boolean;
  position?: number;
}

export interface FlashcardSRS {
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  nextReview: Date;
  lastReviewed?: Date;
  interval: number;
  easeFactor: number;
  position?: number;
  srsType?: 'interval' | 'position';
}

export interface Flashcard extends FlashcardStats, FlashcardSRS {
  id: string;
  userId: string;
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseTranslation?: string;
  exampleSentence?: string;
  difficulty: number;
  categories: Record<string, number>;
  created: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface UserStudyStats {
  lastStudied: Date;
  streak: number;
  totalCards: number;
  totalWorksheets: number;
  masteredCards: number;
  averageAccuracy: number;
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  weeklyStudyGoal: number;
  totalStudySessions: number;
  todayStudyMinutes: number;
  studyMinutes: number;
  lastStudyDate: string;
  weeklyProgress: number;
  createdAt: Date;
  weekStart: Date;
  totalStudyDays: number;
}

export type QuestionType = 'multipleChoice' | 'translation' | 'writing';

export interface WorksheetQuestion {
  id?: string;
  type: QuestionType;
  question: string;
  correctAnswer: string;
  options?: string[];
  explanation?: string;
  points: number;
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface WorksheetStats {
  completed: number;
  total: number;
  lastAttempted?: Date;
  accuracy?: number;
}

export interface Worksheet {
  id?: string;
  userId: string;
  templateId: string;
  title: string;
  words: string[];
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  categories: string[];
  createdAt: Date;
  questions: WorksheetQuestion[];
  content?: any;
  answers?: {
    [questionId: string]: {
      correctAnswer: string;
      explanation?: string;
      examples?: string[];
    };
  };
  stats: WorksheetStats;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  cardsReviewed: number;
  cardsCorrect: number;
}

export interface StudyProgress {
  currentIndex: number;
  stats: {
    correct: number;
    incorrect: number;
    streak: number;
    cardsReviewed: number;
    timeSpent: number;
  };
  mode: StudyMode;
  cards: Flashcard[];
  sessionStart: Date;
  savedAt?: Date;
}

export interface StudyStats {
  lastStudied: Date;
  totalCards: number;
  masteredCards: number;
  averageAccuracy: number;
  totalSessions: number;
  longestStreak: number;
  todayCards: number;
  categoryStats?: Record<string, number>;
  rewards: StudyReward[];
  streak: StudyStreak;
  level: number;
  experience: number;
  nextLevelExp: number;
}

export interface StudySessionSummary {
  duration: number;
  cardsStudied: number;
  accuracy: number;
  streak: number;
  masteredCards: number;
}

export interface VocabularyWord {
  id: string;
  word: string;
  englishDefinition: string;
  chineseTranslation: string;
  partOfSpeech: string;
  categories?: string[];
  createdAt?: Date;
  lastReviewed?: Date;
  nextReview?: Date;
  difficulty?: number;
}

export interface VocabularyDefinition {
  word: string;
  englishDefinition: string;
  chineseTranslation?: string;
  partOfSpeech: string;
  examples?: string[];
}

export interface StudyReward {
  id: string;
  name: string;
  description: string;
  condition: string;
  icon: string;
  achieved: boolean;
}

export interface StudyStreak {
  currentStreak: number;
  bestStreak: number;
  lastStudyDate: Date;
  streakStartDate: Date;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export type StudyMode = 'flashcard' | 'multipleChoice' | 'fillInBlanks' | 'matching';

export interface MultipleChoiceQuestion {
  word: string;
  correctAnswer: string;
  options: string[];
  explanation?: string;
}

export interface FillInBlanksQuestion {
  sentence: string;
  missingWord: string;
  hint?: string;
}

export interface MatchingPair {
  word: string;
  definition: string;
}

export interface MatchingSet {
  pairs: MatchingPair[];
}

export interface StudyCardProgress {
  cardId: string;
  rating: number;
  isCorrect: boolean;
  mode: StudyMode;
  timeSpent: number;
  state?: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  interval?: number;
  easeFactor?: number;
  nextReview?: Date;
  position?: number;
  srsType?: 'interval' | 'position';
}

export interface FlashcardCounter {
  count: number;
  items: FlashcardItem[];
  categories: Record<string, number>;
  indexMap: Record<string, number>;
  lastUpdated: Date;
  metadata: FlashcardCollectionMetadata;
}

export interface FlashcardItem {
  id: string;
  word: string;
  updatedAt: Date;
  categories: Record<string, number>;
}

export interface FlashcardCollectionMetadata {
  totalMastered: number;
  lastStudied: Date | null;
  averageAccuracy: number;
  reviewsDue: number;
  categoriesCount: number;
  vocabList: any[];
  progressStats: {
    new: number;
    learning: number;
    review: number;
    relearn: number;
  };
  studyQueue: StudyQueue[];
  queueLastUpdated: Date;
}

export interface StudyQueue {
  cardId: string;
  nextPosition: number;
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  interval: number;
  position?: number;
  easeFactor: number;
  difficulty?: number;
  nextReview: Date;
  lastReviewed?: Date;
  srsType?: 'interval' | 'position';
  performance?: QueueItemPerformance;
  consecutive?: number;
}

export interface StudySessionMetadata {
  totalCards: number;
  loadedCards: number;
  preloadedIds: string[];
  currentIndex: number;
  categoryDistribution: Record<string, number>;
}

export interface SearchMetadata {
  query: string;
  filters: {
    categories?: string[];
    difficulty?: number;
    mastered?: boolean;
    dueOnly?: boolean;
  };
  results: FlashcardMetadata[];
}

export interface FlashcardMetadata {
  id: string;
  word: string;
  categories: Record<string, number>;
  nextReview?: Date;
  difficulty: number;
  position?: number;
  state?: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  userId?: string;
}

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  notifications: boolean;
  audioEnabled: boolean;
  dailyGoal: number;
  studySessionLength: number;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    autoStartBreak: boolean;
  };
  studyVocabLimit: number;
  language: string;
  appMode: 'flashcards' | 'reading';
  lastModeSwitch?: string;
  lastUpdated?: string;
  readingSettings: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    enableTTS: boolean;
    autoScroll: boolean;
    highlightColor: string;
    focusModeEnabled: boolean;
    readingSpeed?: number;
    highlightCategories?: string[];
    theme: 'light' | 'dark' | 'sepia';
  };
  preloadBatchSize: number;
  cacheTimeout: number;
  studySettings: {
    srsType: 'interval' | 'position';
    defaultNewCardsPerDay: number;
    defaultReviewsPerDay: number;
  };
}

export interface SRSStats {
  newCards: number;
  learningCards: number;
  relearningCards: number;
  reviewCards: number;
  matureCards: number;
  averageSuccessRate: number;
  averageInterval: number;
}

export interface QueueItemPerformance {
  totalAttempts: number;
  correctAttempts: number;
  lastAttempts: Array<{
    timestamp: Date;
    success: boolean;
  }>;
  averageInterval: number;
  streakCount: number;
  cardId?: string;
}

export interface QueueStats {
  stateDistribution: {
    new: number;
    learning: number;
    review: number;
    relearn: number;
  };
  performanceMetrics: {
    averageSuccessRate: number;
    totalReviews: number;
    averageInterval: number;
  };
  lastOptimized: Date;
}

export interface FlashcardReviewLog {
  id: string;
  cardId: string;
  userId: string;
  timestamp: Date;
  rating: number;
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  interval: number;
  easeFactor: number;
  timeSpent: number;
  reviewType: 'interval' | 'position';
  performance?: {
    responseTime: number;
    accuracy: number;
    reviewTimeOfDay: number;
  };
}

export interface LearningCurveData {
  intervals: number[];
  accuracyRates: number[];
  retentionScores: number[];
  reviewCounts: number[];
}
