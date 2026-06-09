export interface ArticleProgress {
  wordsRead: number;
  lastPosition: number;
  completed: boolean;
  progress: number;
  timeSpent: number;
  readingSpeed?: number;
  lastRead?: Date;
  completionDate?: Date;
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  category: string;
  coverImage?: string;
  wordCount: number;
  createdAt: Date;
  updatedAt?: Date;
  lastRead?: Date | null;
  readCount: number;
  readingTime: number;
  progress: ArticleProgress;
  sourceUrl?: string;
}

export interface ArticleImport {
  title: string;
  subtitle?: string;
  content: string;
  category?: string;
  coverImage?: File;
  sourceUrl?: string;
}

export interface ReadingPreferences {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  focusModeEnabled: boolean;
  enableTTS: boolean;
  theme: 'light' | 'dark' | 'sepia';
}

export interface ArticleCounterItem {
  id: string;
  title: string;
  category: string;
  updatedAt: Date;
}

export interface ArticleCounter {
  count: number;
  items: ArticleCounterItem[];
  categories: Record<string, number>;
  indexMap: Record<string, number>;
  lastUpdated: Date | null;
}

export interface ArticleNote {
  id: string;
  text: string;
  highlight: string;
  category: string;
  timestamp: number;
}

export type ArticleSort = 'recent' | 'title' | 'readTime' | 'progress' | 'random';

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.7,
  focusModeEnabled: false,
  enableTTS: false,
  theme: 'light',
};

export const EMPTY_ARTICLE_PROGRESS: ArticleProgress = {
  wordsRead: 0,
  lastPosition: 0,
  completed: false,
  progress: 0,
  timeSpent: 0,
};

export const PARAGRAPHS_PER_PAGE = 50;
