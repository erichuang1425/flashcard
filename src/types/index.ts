export interface Flashcard {
  id: string;
  userId: string;
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseTranslation?: string;
  difficulty: number;
  categories: string[];  
  created: Date;
  lastReviewed?: Date;
  nextReview: Date;
  mastered: boolean;
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
  correct: number;
  incorrect: number;
  streak: number;
  cardsReviewed: number;
}

export interface StudyStats {
  lastStudied: Date;
  totalCards: number;
  masteredCards: number;
  averageAccuracy: number;
  totalSessions: number;
  longestStreak: number;
  todayCards: number;
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

export interface DiaryEntry {
  id: string;
  userId: string;
  text: string;
  createdAt: Date;
  imageUrl?: string;
}
