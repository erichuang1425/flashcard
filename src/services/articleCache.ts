const CACHE_PREFIX = 'flashcard.reading.article.v1';
const CACHE_DURATION_MS = 30 * 60 * 1000;

interface CachedArticleContent {
  content: string;
  timestamp: number;
}

const defaultStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const cacheKey = (userId: string, articleId: string) =>
  `${CACHE_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(articleId)}`;

export const writeCachedArticle = (
  userId: string,
  articleId: string,
  content: string,
  timestamp = Date.now(),
  storage: Storage | null = defaultStorage()
): void => {
  if (!storage) return;

  try {
    const value: CachedArticleContent = { content, timestamp };
    storage.setItem(cacheKey(userId, articleId), JSON.stringify(value));
  } catch {
    // Cache failures must never block reading or importing an article.
  }
};

export const readCachedArticle = (
  userId: string,
  articleId: string,
  now = Date.now(),
  storage: Storage | null = defaultStorage()
): string | null => {
  if (!storage) return null;

  const key = cacheKey(userId, articleId);

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return null;

    const value = JSON.parse(rawValue) as Partial<CachedArticleContent>;
    const expired =
      typeof value.timestamp !== 'number' ||
      now - value.timestamp > CACHE_DURATION_MS;

    if (expired || typeof value.content !== 'string') {
      storage.removeItem(key);
      return null;
    }

    return value.content;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const clearCachedArticle = (
  userId: string,
  articleId: string,
  storage: Storage | null = defaultStorage()
): void => {
  if (!storage) return;
  storage.removeItem(cacheKey(userId, articleId));
};
