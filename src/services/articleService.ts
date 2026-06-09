import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db, storage } from './firebase';
import {
  Article,
  ArticleCounter,
  ArticleCounterItem,
  ArticleImport,
  ArticleProgress,
  ArticleSort,
  EMPTY_ARTICLE_PROGRESS,
} from '../types/reading';
import { isValidText, sanitizeText } from '../utils/textSanitizer';
import {
  clearCachedArticle,
  readCachedArticle,
  writeCachedArticle,
} from './articleCache';
import { ArticleError, logger } from './logging';

interface ArticlePageOptions {
  page: number;
  limit: number;
  filters?: {
    category?: string;
    searchTerm?: string;
  };
  sort?: {
    sortBy?: ArticleSort;
  };
}

interface ArticleFilterOptions {
  category?: string;
  searchTerm?: string;
  sortBy?: ArticleSort;
}

type FirestoreDate =
  | Date
  | string
  | number
  | { toDate?: () => Date }
  | null
  | undefined;

const toDate = (value: FirestoreDate, fallback?: Date): Date | undefined => {
  if (!value) return fallback;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProgress = (value: unknown): ArticleProgress => {
  const progress =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  return {
    wordsRead: Math.max(0, toNumber(progress.wordsRead)),
    lastPosition: Math.max(0, toNumber(progress.lastPosition)),
    completed: Boolean(progress.completed),
    progress: Math.min(100, Math.max(0, toNumber(progress.progress))),
    timeSpent: Math.max(0, toNumber(progress.timeSpent)),
    readingSpeed:
      progress.readingSpeed === undefined
        ? undefined
        : Math.max(0, toNumber(progress.readingSpeed)),
    lastRead: toDate(progress.lastRead as FirestoreDate),
    completionDate: toDate(progress.completionDate as FirestoreDate),
  };
};

const removeUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }
  if (value instanceof Date || !value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, removeUndefined(entry)])
  );
};

export const toArticleDocument = (article: Article): Record<string, unknown> =>
  removeUndefined(article) as Record<string, unknown>;

export const countArticleWords = (text: string): number => {
  const matches = text.match(
    /[\p{Script=Han}]|[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu
  );
  return matches?.length ?? 0;
};

export const normalizeArticleDocument = (
  id: string,
  data: Record<string, unknown>
): Article => {
  const content = typeof data.content === 'string' ? data.content : undefined;
  const wordCount = Math.max(
    0,
    toNumber(data.wordCount, content ? countArticleWords(content) : 0)
  );
  const createdAt = toDate(data.createdAt as FirestoreDate, new Date(0)) as Date;

  return {
    id,
    title: sanitizeText(String(data.title ?? '')) || 'Untitled article',
    subtitle:
      typeof data.subtitle === 'string'
        ? sanitizeText(data.subtitle) || undefined
        : undefined,
    content,
    category:
      typeof data.category === 'string' && data.category.trim()
        ? sanitizeText(data.category)
        : 'uncategorized',
    coverImage:
      typeof data.coverImage === 'string' && data.coverImage
        ? data.coverImage
        : undefined,
    wordCount,
    createdAt,
    updatedAt: toDate(data.updatedAt as FirestoreDate),
    lastRead: toDate(data.lastRead as FirestoreDate) ?? null,
    readCount: Math.max(0, toNumber(data.readCount)),
    readingTime: Math.max(
      1,
      toNumber(data.readingTime, Math.ceil(wordCount / 200))
    ),
    progress: normalizeProgress(data.progress),
    sourceUrl:
      typeof data.sourceUrl === 'string' && data.sourceUrl
        ? data.sourceUrl
        : undefined,
  };
};

export const filterAndSortArticles = (
  articles: Article[],
  options: ArticleFilterOptions = {}
): Article[] => {
  const searchTerm = options.searchTerm?.trim().toLocaleLowerCase();

  const filtered = articles.filter((article) => {
    if (options.category && article.category !== options.category) return false;
    if (!searchTerm) return true;

    return [article.title, article.subtitle, article.content]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(searchTerm));
  });

  const sortBy = options.sortBy ?? 'recent';
  if (sortBy === 'random') {
    const shuffled = [...filtered];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }
    return shuffled;
  }

  return [...filtered].sort((left, right) => {
    switch (sortBy) {
      case 'title':
        return left.title.localeCompare(right.title);
      case 'readTime':
        return right.readingTime - left.readingTime;
      case 'progress':
        return right.progress.progress - left.progress.progress;
      case 'recent':
      default: {
        const leftDate =
          left.lastRead ?? left.updatedAt ?? left.createdAt;
        const rightDate =
          right.lastRead ?? right.updatedAt ?? right.createdAt;
        return rightDate.getTime() - leftDate.getTime();
      }
    }
  });
};

const normalizeCounterItem = (
  value: unknown,
  fallbackDate: Date
): ArticleCounterItem | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return null;

  return {
    id: item.id,
    title:
      typeof item.title === 'string' && item.title
        ? item.title
        : 'Untitled article',
    category:
      typeof item.category === 'string' && item.category
        ? item.category
        : 'uncategorized',
    updatedAt:
      toDate(item.updatedAt as FirestoreDate, fallbackDate) ?? fallbackDate,
  };
};

export const normalizeArticleCounter = (
  data: Record<string, unknown> | undefined
): ArticleCounter => {
  const fallbackDate = new Date(0);
  const items = Array.isArray(data?.items)
    ? data.items
        .map((item) => normalizeCounterItem(item, fallbackDate))
        .filter((item): item is ArticleCounterItem => Boolean(item))
    : [];

  return {
    count: Math.max(0, toNumber(data?.count, items.length)),
    items,
    categories:
      data?.categories && typeof data.categories === 'object'
        ? { ...(data.categories as Record<string, number>) }
        : {},
    indexMap:
      data?.indexMap && typeof data.indexMap === 'object'
        ? { ...(data.indexMap as Record<string, number>) }
        : {},
    lastUpdated: toDate(data?.lastUpdated as FirestoreDate) ?? null,
  };
};

export const importArticle = async (
  userId: string,
  input: ArticleImport
): Promise<Article> => {
  if (!isValidText(input.title) || !isValidText(input.content)) {
    throw new ArticleError('Article contains invalid or empty text', {
      userId,
    });
  }

  const articleRef = doc(collection(db, 'users', userId, 'articles'));
  const coverRef = ref(
    storage,
    `users/${userId}/articles/${articleRef.id}/cover`
  );
  let coverImage: string | undefined;

  try {
    if (input.coverImage) {
      await uploadBytes(coverRef, input.coverImage);
      coverImage = await getDownloadURL(coverRef);
    }

    const now = new Date();
    const title = sanitizeText(input.title);
    const content = sanitizeText(input.content);
    const category = sanitizeText(input.category ?? '') || 'uncategorized';
    const wordCount = countArticleWords(content);
    const progress = { ...EMPTY_ARTICLE_PROGRESS };
    const article: Article = {
      id: articleRef.id,
      title,
      subtitle: input.subtitle
        ? sanitizeText(input.subtitle) || undefined
        : undefined,
      content,
      category,
      coverImage,
      wordCount,
      createdAt: now,
      updatedAt: now,
      lastRead: null,
      readCount: 0,
      readingTime: Math.max(1, Math.ceil(wordCount / 200)),
      progress,
      sourceUrl: input.sourceUrl?.trim() || undefined,
    };

    const counterRef = doc(db, 'users', userId, 'counters', 'articles');
    await runTransaction(db, async (transaction) => {
      const counterSnapshot = await transaction.get(counterRef);
      const counter = normalizeArticleCounter(
        counterSnapshot.exists()
          ? (counterSnapshot.data() as Record<string, unknown>)
          : undefined
      );
      const currentCount = Math.max(counter.count, counter.items.length);
      const nextItem: ArticleCounterItem = {
        id: article.id,
        title: article.title,
        category: article.category,
        updatedAt: now,
      };

      transaction.set(articleRef, toArticleDocument(article));
      transaction.set(
        counterRef,
        {
          count: currentCount + 1,
          items: [...counter.items, nextItem],
          categories: {
            ...counter.categories,
            [article.category]:
              toNumber(counter.categories[article.category]) + 1,
          },
          indexMap: {
            ...counter.indexMap,
            [article.id]: currentCount,
          },
          lastUpdated: now,
        },
        { merge: true }
      );
    });

    writeCachedArticle(userId, article.id, content);
    return article;
  } catch (error) {
    if (input.coverImage) {
      await deleteObject(coverRef).catch(() => undefined);
    }
    logger.error(
      'Failed to import article',
      error instanceof Error ? error : new Error(String(error)),
      { userId, title: input.title }
    );
    throw error;
  }
};

export const getArticlePage = async (
  userId: string,
  options: ArticlePageOptions
): Promise<{ articles: Article[]; totalCount: number; hasMore: boolean }> => {
  const snapshot = await getDocs(collection(db, 'users', userId, 'articles'));
  const allArticles = snapshot.docs.map((snapshot) =>
    normalizeArticleDocument(
      snapshot.id,
      snapshot.data() as Record<string, unknown>
    )
  );
  const filtered = filterAndSortArticles(allArticles, {
    category: options.filters?.category,
    searchTerm: options.filters?.searchTerm,
    sortBy: options.sort?.sortBy,
  });
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.limit);
  const startIndex = (page - 1) * pageSize;

  return {
    articles: filtered.slice(startIndex, startIndex + pageSize),
    totalCount: filtered.length,
    hasMore: startIndex + pageSize < filtered.length,
  };
};

export const getUserArticles = async (
  userId: string,
  limitCount = 50
): Promise<Article[]> => {
  const result = await getArticlePage(userId, {
    page: 1,
    limit: limitCount,
  });
  return result.articles;
};

export const getFullArticle = async (
  userId: string,
  articleId: string
): Promise<Article | null> => {
  const snapshot = await getDoc(
    doc(db, 'users', userId, 'articles', articleId)
  );
  if (!snapshot.exists()) return null;

  const article = normalizeArticleDocument(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );
  const cachedContent = readCachedArticle(userId, articleId);

  if (cachedContent) {
    article.content = cachedContent;
  } else if (article.content) {
    writeCachedArticle(userId, articleId, article.content);
  }

  return article;
};

export const getRandomArticle = async (
  userId: string
): Promise<Article | null> => {
  const result = await getArticlePage(userId, {
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    sort: { sortBy: 'random' },
  });
  const selected = result.articles[0];
  return selected ? getFullArticle(userId, selected.id) : null;
};

export const updateArticleProgress = async (
  userId: string,
  articleId: string,
  update: Partial<ArticleProgress>
): Promise<ArticleProgress> => {
  const articleRef = doc(db, 'users', userId, 'articles', articleId);
  const statsRef = doc(db, 'users', userId, 'stats', 'reading');

  return runTransaction(db, async (transaction) => {
    const articleSnapshot = await transaction.get(articleRef);
    if (!articleSnapshot.exists()) {
      throw new ArticleError('Article not found', { userId, articleId });
    }

    const current = normalizeArticleDocument(
      articleSnapshot.id,
      articleSnapshot.data() as Record<string, unknown>
    );
    const now = new Date();
    const next = normalizeProgress({
      ...current.progress,
      ...update,
      lastRead: update.lastRead ?? now,
      completionDate:
        update.completed && !current.progress.completed
          ? update.completionDate ?? now
          : update.completionDate ?? current.progress.completionDate,
    });

    transaction.update(articleRef, {
      progress: next,
      lastRead: now,
      updatedAt: now,
    });

    if (next.completed && !current.progress.completed) {
      transaction.set(
        statsRef,
        {
          completedArticles: increment(1),
          totalWordsRead: increment(next.wordsRead || current.wordCount),
          lastCompletedAt: now,
        },
        { merge: true }
      );
    }

    return next;
  });
};

export const batchDeleteArticles = async (
  userId: string,
  articleIds: string[]
): Promise<void> => {
  const uniqueIds = [...new Set(articleIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const counterRef = doc(db, 'users', userId, 'counters', 'articles');

  await runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);
    const counter = normalizeArticleCounter(
      counterSnapshot.exists()
        ? (counterSnapshot.data() as Record<string, unknown>)
        : undefined
    );
    const deletedIds = new Set(uniqueIds);
    const removedItems = counter.items.filter((item) =>
      deletedIds.has(item.id)
    );
    const remainingItems = counter.items.filter(
      (item) => !deletedIds.has(item.id)
    );
    const categories = { ...counter.categories };

    for (const item of removedItems) {
      categories[item.category] = Math.max(
        0,
        toNumber(categories[item.category]) - 1
      );
    }

    const indexMap = Object.fromEntries(
      remainingItems.map((item, index) => [item.id, index])
    );

    for (const articleId of uniqueIds) {
      transaction.delete(doc(db, 'users', userId, 'articles', articleId));
    }
    transaction.set(
      counterRef,
      {
        count: Math.max(
          0,
          Math.max(counter.count, counter.items.length) - uniqueIds.length
        ),
        items: remainingItems,
        categories,
        indexMap,
        lastUpdated: new Date(),
      },
      { merge: true }
    );
  });

  await Promise.all(
    uniqueIds.map(async (articleId) => {
      clearCachedArticle(userId, articleId);
      await deleteObject(
        ref(storage, `users/${userId}/articles/${articleId}/cover`)
      ).catch(() => undefined);
    })
  );
};

export const deleteArticle = (userId: string, articleId: string) =>
  batchDeleteArticles(userId, [articleId]);

export const setArticleCover = async (
  userId: string,
  articleId: string,
  cover: File | null
): Promise<string | undefined> => {
  const coverRef = ref(
    storage,
    `users/${userId}/articles/${articleId}/cover`
  );
  let coverImage: string | undefined;

  if (cover) {
    await uploadBytes(coverRef, cover);
    coverImage = await getDownloadURL(coverRef);
  } else {
    await deleteObject(coverRef).catch(() => undefined);
  }

  await updateDoc(doc(db, 'users', userId, 'articles', articleId), {
    coverImage: coverImage ?? null,
    updatedAt: new Date(),
  });

  return coverImage;
};

export const initializeArticleCounter = async (userId: string): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId, 'counters', 'articles'),
    {
      count: 0,
      items: [],
      categories: {},
      indexMap: {},
      lastUpdated: new Date(),
    },
    { merge: true }
  );
};
