export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  coverImage?: string;
  wordCount: number;
  createdAt: string; 
  updatedAt: string; 
  lastRead?: Date;
  readCount: number;
  readingTime: number;
  progress: ArticleProgress;
  sourceUrl?: string;
}

export interface ArticleProgress {
  wordsRead: number;
  lastPosition: number;
  completed: boolean;
  progress: number;
  lastRead?: Date;
  timeSpent: number;
  completionDate?: Date;
}

export interface ReadingProgress extends ArticleProgress {
  articleId: string;
  userId: string;
  lastUpdated: string;
}

export interface ReadingPreferences {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  focusModeEnabled: boolean;
  enableTTS: boolean;
  theme: 'light' | 'dark' | 'sepia';
}

export interface ArticleMeta {
  id: string;
  title: string;
  category: string;
  wordCount: number;
  progress: ArticleProgress;
}

export interface ArticleCache {
  articles: Article[];
  totalCount: number;
  lastUpdated: string;
  timestamp: number;
}

export interface ArticleCounter {
  count: number;
  articleIds: string[];
  lastUpdated: Date;
}

export interface ArticlePageCache {
  content: string[];
  timestamp: number;
}

export interface ArticleContentCache {
  [articleId: string]: {
    [pageNum: number]: ArticlePageCache;
  };
}

export const PARAGRAPHS_PER_PAGE = 50;