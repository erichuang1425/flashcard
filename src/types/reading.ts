export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  coverImage?: string;
  wordCount: number;
  createdAt: string; // Changed from Date to string to match context
  updatedAt: string; // Add this field
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

export const PARAGRAPHS_PER_PAGE = 50; // Configuration constant