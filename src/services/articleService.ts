import { 
  collection, doc, getDocs, setDoc, query, 
  where, orderBy, limit, startAfter, increment,
  serverTimestamp, DocumentSnapshot, writeBatch,
  deleteDoc, getDoc, arrayUnion, arrayRemove,
  documentId
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import localforage from 'localforage';
import { Article, ArticleCounter, ArticleContentCache, ArticlePageCache, PARAGRAPHS_PER_PAGE } from '../types/reading';
import { chunk } from 'lodash';
import { logger, ArticleError, CacheError } from './logging';
import { sanitizeText, isValidText } from '../utils/textSanitizer';

interface CursorPagination {
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

interface ArticleMetadata {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  coverImage?: string;
  wordCount: number;
  createdAt: Date;
  lastRead?: Date;
  readCount: number;
  progress: {
    wordsRead: number;
    lastPosition: number;
    completed: boolean;
  };
}

const CACHE_KEY = 'articles_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CONTENT_CACHE_KEY = 'article_content_cache';
const PAGE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const ARTICLE_CACHE_KEY = 'article_cache_v1';

const METADATA_CACHE_KEY = 'article_metadata_cache_v1';
const METADATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface ArticleCache {
  content: string;
  timestamp: number;
}

interface SearchFilters {
  category?: string;
  searchTerm?: string;
}

// Add new cache functions
const setCachedArticle = async (articleId: string, content: string): Promise<void> => {
  try {
    const cache = await localforage.getItem<Record<string, ArticleCache>>(ARTICLE_CACHE_KEY) || {};
    cache[articleId] = {
      content,
      timestamp: Date.now()
    };
    await localforage.setItem(ARTICLE_CACHE_KEY, cache);
  } catch (error) {
    logger.warn('Failed to cache article', error as Error);
  }
};

const getCachedArticle = async (articleId: string): Promise<string | null> => {
  try {
    const cache = await localforage.getItem<Record<string, ArticleCache>>(ARTICLE_CACHE_KEY);
    const articleCache = cache?.[articleId];
    
    if (!articleCache || Date.now() - articleCache.timestamp > CACHE_DURATION) {
      return null;
    }
    
    return articleCache.content;
  } catch (error) {
    logger.warn('Failed to retrieve cached article', error as Error);
    return null;
  }
};

export const checkArticleCache = async (): Promise<ArticleCache | null> => {
  const debugId = Math.random().toString(36).substring(7);
  try {
    logger.info(`[${debugId}] Checking cache`, { key: CACHE_KEY });
    const cache = await localforage.getItem<ArticleCache>(CACHE_KEY);
    
    if (!cache) {
      logger.info(`[${debugId}] Cache miss`, { key: CACHE_KEY });
      return null;
    }

    if (Date.now() - cache.timestamp > CACHE_DURATION) {
      logger.info(`[${debugId}] Cache expired`, { key: CACHE_KEY });
      await localforage.removeItem(CACHE_KEY);
      return null;
    }

    logger.info(`[${debugId}] Cache hit`, { key: CACHE_KEY });
    return cache;
  } catch (err) {
    const error = new CacheError('Failed to check article cache', { key: CACHE_KEY });
    logger.error('Cache error', error, { originalError: err });
    return null;
  }
};

export const cacheArticles = async (data: Omit<ArticleCache, 'timestamp'>) => {
  try {
    await localforage.setItem(CACHE_KEY, {
      ...data,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Failed to cache articles:', err);
  }
};

interface FetchOptions {
  page: number;
  limit: number;
  lastUpdated?: string;
}

export const initializeArticleCounter = async (userId: string) => {
  const counterRef = doc(db, 'users', userId, 'counters', 'articles');
  
  try {
    await setDoc(counterRef, {
      count: 0,
      items: [],
      categories: {},
      indexMap: {},
      lastUpdated: new Date()
    });
  } catch (error) {
    logger.error('Error initializing article counter:', error as Error);
    throw error;
  }
};

export const importArticle = async (userId: string, article: any) => {
  try {
    // Validate text content
    if (!isValidText(article.content) || !isValidText(article.title)) {
      throw new Error('Article contains too many invalid characters');
    }

    const articleRef = doc(collection(db, 'users', userId, 'articles'));
    const batch = writeBatch(db);
    
    let coverImageUrl = '';
    if (article.coverImage) {
      const imageRef = ref(storage, `users/${userId}/articles/${articleRef.id}/cover`);
      await uploadBytes(imageRef, article.coverImage);
      coverImageUrl = await getDownloadURL(imageRef);
    }

    const sanitizedTitle = sanitizeText(article.title);
    const sanitizedSubtitle = article.subtitle ? sanitizeText(article.subtitle) : undefined;
    const sanitizedContent = sanitizeText(article.content);

    const wordCount = sanitizedContent.split(/\s+/).length;
    
    const metadata: ArticleMetadata = {
      id: articleRef.id,
      title: sanitizedTitle,
      subtitle: sanitizedSubtitle,
      category: article.category,
      coverImage: coverImageUrl,
      wordCount,
      createdAt: new Date(),
      readCount: 0,
      progress: {
        wordsRead: 0,
        lastPosition: 0,
        completed: false
      }
    };

    batch.set(articleRef, {
      ...metadata,
      content: sanitizedContent,
      sourceUrl: article.sourceUrl
    });

    const counterRef = doc(db, 'users', userId, 'counters', 'articles');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      await initializeArticleCounter(userId);
    }

    const newItem = {
      id: articleRef.id,
      title: article.title,
      updatedAt: new Date()
    };

    batch.update(counterRef, {
      count: increment(1),
      items: arrayUnion(newItem),
      [`categories.${article.category || 'uncategorized'}`]: increment(1),
      [`indexMap.${articleRef.id}`]: counterDoc.data()?.count || 0,
      lastUpdated: new Date()
    });

    await batch.commit();
    await localforage.removeItem(CACHE_KEY);

    return metadata;
  } catch (err) {
    const error = new ArticleError('Failed to import article', {
      userId,
      articleTitle: article.title,
      hasImage: !!article.coverImage
    });
    logger.error('Import failed', error, { originalError: err });
    throw error;
  }
};

export const deleteArticle = async (userId: string, articleId: string) => {
  const batch = writeBatch(db);
  
  const articleRef = doc(db, 'users', userId, 'articles', articleId);
  batch.delete(articleRef);

  const counterRef = doc(db, 'users', userId, 'counters', 'articles');
  batch.update(counterRef, {
    count: increment(-1),
    articleIds: arrayRemove(articleId),
    lastUpdated: new Date()
  });

  await batch.commit();
};

export const getUserArticles = async (
  userId: string, 
  options: { 
    limit: number;
    startAfter?: DocumentSnapshot;
    category?: string;
    lastUpdated?: string;
  }
): Promise<{ articles: Article[]; lastDoc: DocumentSnapshot | null; totalCount: number }> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'articles');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    const articlesRef = collection(db, 'users', userId, 'articles');
    const snapshot = await getDocs(articlesRef);
    const count = snapshot.size;
    
    await setDoc(counterRef, {
      count,
      lastUpdated: new Date()
    });
  }

  const totalCount = counterDoc.exists() ? counterDoc.data().count : 0;

  const articlesRef = collection(db, 'users', userId, 'articles');
  let articlesQuery = query(
    articlesRef,
    orderBy('createdAt', 'desc'),
    limit(options.limit)
  );

  if (options.startAfter) {
    articlesQuery = query(articlesQuery, startAfter(options.startAfter));
  }

  if (options.category) {
    articlesQuery = query(articlesQuery, where('category', '==', options.category));
  }

  const snapshot = await getDocs(articlesQuery);
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return {
    articles: snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Article[],
    lastDoc,
    totalCount
  };
};

export const getRecentArticles = async (userId: string, limitCount = 5) => {
  const articlesRef = collection(db, 'users', userId, 'articles');
  const snapshot = await getDocs(query(
    articlesRef,
    orderBy('lastRead', 'desc'),
    limit(limitCount)
  ));

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Article[];
};

const updateArticleCounter = async (userId: string, change: number) => {
    const userRef = doc(db, 'users', userId);
    try {
        await setDoc(userRef, {
            articleCount: change > 0 ? increment(change) : increment(change)
        }, { merge: true });
    } catch (error) {
        console.error('Error updating article counter:', error);
        throw error;
    }
};

const getLastDocument = async (userId: string, page: number) => {
  const skipCount = (page - 1) * 50;
  const articlesRef = collection(db, 'users', userId, 'articles');
  const q = query(articlesRef, orderBy('createdAt', 'desc'), limit(1), startAfter(skipCount));
  const snapshot = await getDocs(q);
  return snapshot.docs[0];
};

export const updateArticleProgress = async (
  userId: string,
  articleId: string,
  progress: {
    wordsRead: number;
    lastPosition: number;
    completed: boolean;
  }
) => {
  const articleRef = doc(db, 'users', userId, 'articles', articleId);
  
  await setDoc(articleRef, {
    progress,
    lastRead: serverTimestamp(),
    readCount: increment(1)
  }, { merge: true });

  await localforage.removeItem(CACHE_KEY);
};

const getCountFromServer = async (ref: any) => {
  const snapshot = await getDocs(ref);
  return { data: () => ({ count: snapshot.size }) };
};

export const getArticleCount = async (userId: string): Promise<ArticleCounter> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'articles');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    await initializeArticleCounter(userId);
    return {
      count: 0,
      articleIds: [],
      lastUpdated: new Date()
    };
  }
  
  return counterDoc.data() as ArticleCounter;
};

export const getArticlePageContent = async (
  userId: string, 
  articleId: string, 
  pageNum: number,
  preloadNext = true
): Promise<string[]> => {
  try {
    // Try cache first
    const cachedContent = await getCachedArticle(articleId);
    let content: string;

    if (cachedContent) {
      content = cachedContent;
    } else {
      const articleRef = doc(db, 'users', userId, 'articles', articleId);
      const articleDoc = await getDoc(articleRef);
      
      if (!articleDoc.exists()) {
        throw new Error('Article not found');
      }

      content = articleDoc.data().content;
      await setCachedArticle(articleId, content);
    }

    const paragraphs = content.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const startIdx = pageNum * PARAGRAPHS_PER_PAGE;
    const endIdx = startIdx + PARAGRAPHS_PER_PAGE;
    
    return paragraphs.slice(startIdx, endIdx);
  } catch (err) {
    const error = new ArticleError('Failed to fetch article content', {
      userId,
      articleId,
      pageNum
    });
    logger.error('Content fetch failed', error);
    throw error;
  }
};

const getContentCache = async (): Promise<ArticleContentCache | null> => {
  try {
    return await localforage.getItem(CONTENT_CACHE_KEY) || null;
  } catch {
    return null;
  }
};

const isPageCacheStale = (pageCache: ArticlePageCache): boolean => {
  return Date.now() - pageCache.timestamp > PAGE_CACHE_DURATION;
};

const cacheArticlePage = async (
  articleId: string, 
  pageNum: number, 
  content: string[]
): Promise<void> => {
  try {
    const cache = await getContentCache() || {};
    
    if (!cache[articleId]) {
      cache[articleId] = {};
    }

    cache[articleId][pageNum] = {
      content,
      timestamp: Date.now()
    };

    await localforage.setItem(CONTENT_CACHE_KEY, cache);
  } catch (error) {
    console.error('Error caching article page:', error);
  }
};

const preloadArticlePage = async (
  userId: string, 
  articleId: string, 
  pageNum: number,
  existingParagraphs?: string[]
): Promise<void> => {
  try {
    const cache = await getContentCache();
    if (cache?.[articleId]?.[pageNum] && !isPageCacheStale(cache[articleId][pageNum])) {
      return;
    }

    let pageContent: string[];
    if (existingParagraphs) {
      const startIdx = pageNum * PARAGRAPHS_PER_PAGE;
      const endIdx = startIdx + PARAGRAPHS_PER_PAGE;
      pageContent = existingParagraphs.slice(startIdx, endIdx);
    } else {
      const articleRef = doc(db, 'users', userId, 'articles', articleId);
      const articleDoc = await getDoc(articleRef);
      
      if (!articleDoc.exists()) return;

      const allContent = articleDoc.data().content as string;
      const paragraphs = allContent.split('\n');
      const startIdx = pageNum * PARAGRAPHS_PER_PAGE;
      const endIdx = startIdx + PARAGRAPHS_PER_PAGE;
      pageContent = paragraphs.slice(startIdx, endIdx);
    }

    if (pageContent.length > 0) {
      await cacheArticlePage(articleId, pageNum, pageContent);
    }
  } catch (error) {
    console.error('Error preloading article page:', error);
  }
};

export const clearArticleCache = async (articleId?: string): Promise<void> => {
  try {
    if (articleId) {
      const cache = await getContentCache();
      if (cache?.[articleId]) {
        delete cache[articleId];
        await localforage.setItem(CONTENT_CACHE_KEY, cache);
      }
    } else {
      await localforage.removeItem(CONTENT_CACHE_KEY);
    }
  } catch (error) {
    console.error('Error clearing article cache:', error);
  }
};

interface ArticleSearchIndex {
  title: string;
  id: string;
  updatedAt: Date;
}

interface SearchResult {
  items: Article[];
  hasMore: boolean;
}

interface ArticlePage {
  articles: Article[];
  hasMore: boolean;
}

interface QueryOptions {
  limit: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
}

interface SearchResultItem {
  id: string;
  title: string;
  updatedAt: Date;
  wordCount?: number;
}

export interface SearchOptions {
  limit: number;
  startAfter?: string;
  category?: string;
}

interface ArticleMetadataItem {
  id: string;
  title: string;
  updatedAt: Date;
  category?: string;
}

interface ArticleCounterMetadata {
  count: number;
  items: ArticleMetadataItem[];
  lastUpdated: Date;
  categories: { [key: string]: number };
  indexMap: { [key: string]: number };
}

const getCachedMetadata = async (userId: string): Promise<ArticleCounterMetadata | null> => {
  try {
    const cache = await localforage.getItem<{
      data: ArticleCounterMetadata;
      timestamp: number;
      userId: string;
    }>(METADATA_CACHE_KEY);

    if (!cache || cache.userId !== userId || 
        Date.now() - cache.timestamp > METADATA_CACHE_DURATION) {
      return null;
    }

    return cache.data;
  } catch (error) {
    logger.warn('Failed to get cached metadata', error as Error);
    return null;
  }
};

const cacheMetadata = async (userId: string, data: ArticleCounterMetadata): Promise<void> => {
  try {
    await localforage.setItem(METADATA_CACHE_KEY, {
      data,
      timestamp: Date.now(),
      userId
    });
  } catch (error) {
    logger.warn('Failed to cache metadata', error as Error);
  }
};

export const getArticleMetadata = async (userId: string): Promise<ArticleCounterMetadata | null> => {
  // Try cache first
  const cached = await getCachedMetadata(userId);
  if (cached) return cached;

  const counterRef = doc(db, 'users', userId, 'counters', 'articles');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    return null;
  }

  const metadata = counterDoc.data() as ArticleCounterMetadata;
  
  // Cache the fresh metadata
  await cacheMetadata(userId, metadata);

  return metadata;
};

export const getArticlePage = async (
  userId: string,
  options: {
    page: number;
    limit: number;
    filters?: SearchFilters;
  }
): Promise<{ articles: Article[]; totalCount: number; hasMore: boolean }> => {
  try {
    const counterRef = doc(db, 'users', userId, 'counters', 'articles');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      return { articles: [], totalCount: 0, hasMore: false };
    }

    const metadata = counterDoc.data();
    let items = metadata.items || [];
    const totalCount = items.length;

    if (options.filters?.category) {
      items = items.filter((item: { category?: string }) => item.category === options.filters?.category);
    }

    if (options.filters?.searchTerm) {
      const searchLower = options.filters.searchTerm.toLowerCase();
      items = items.filter((item: { title: string }) => item.title.toLowerCase().includes(searchLower));
    }

    const startIndex = (options.page - 1) * options.limit;
    const endIndex = Math.min(startIndex + options.limit, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    const articleIds = pageItems.map((item: { id: string }) => item.id);
    const articles = await batchGetArticles(userId, articleIds);

    const nextPageItems = items.slice(endIndex, endIndex + options.limit);
    if (nextPageItems.length > 0) {
      const nextPageIds = nextPageItems.map((item: { id: string }) => item.id);
      batchGetArticles(userId, nextPageIds).catch(err => 
        logger.warn('Failed to prefetch next page', err)
      );
    }

    return { 
      articles, 
      totalCount: items.length,
      hasMore: endIndex < items.length
    };

  } catch (err) {
    const error = new ArticleError('Failed to fetch article page');
    logger.error('Page fetch failed', error, { originalError: err });
    throw error;
  }
};

const batchGetArticles = async (userId: string, articleIds: string[]): Promise<Article[]> => {
  if (!articleIds.length) {
    logger.info('No articles to fetch in batch request', { userId });
    return [];
  }

  const logContext = {
    userId,
    batchSize: articleIds.length,
    operation: 'batchGetArticles',
    batchId: Math.random().toString(36).substr(2, 9) // Add unique batch ID
  };

  try {
    logger.info('Starting batch article fetch operation', logContext);
    const startTime = Date.now();
    const articles: Article[] = [];
    
    const chunks = chunk(articleIds, 10);
    logger.info('Processing article chunks', { 
      ...logContext, 
      chunks: chunks.length,
      totalArticles: articleIds.length 
    });

    for (const [index, batchIds] of chunks.entries()) {
      const chunkStart = Date.now();
      const articlesRef = collection(db, 'users', userId, 'articles');
      const q = query(articlesRef, where(documentId(), 'in', batchIds));
      
      const snapshot = await getDocs(q);
      
      // Simplified document processing - content is part of the document data
      const batchArticles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          subtitle: data.subtitle,
          category: data.category || 'uncategorized',
          coverImage: data.coverImage,
          wordCount: data.wordCount || 0,
          readingTime: Math.ceil(data.wordCount / 200),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          readCount: data.readCount || 0,
          progress: data.progress || {
            wordsRead: 0,
            lastPosition: 0,
            completed: false
          },
          sourceUrl: data.sourceUrl,
          lastRead: data.lastRead?.toDate() || null
        } as Article;  // Note: Removed content field
      });

      articles.push(...batchArticles);
      
      // Cache the articles after fetching
      batchArticles.forEach(article => {
        if (article.content) {
          setCachedArticle(article.id, article.content).catch(err => 
            logger.warn('Failed to cache article content', err)
          );
        }
      });

      logger.info(`Processing batch chunk ${index + 1}/${chunks.length}`, {
        chunk: {
          batchId: logContext.batchId,
          chunkIndex: index + 1,
          totalChunks: chunks.length,
          requestedIds: batchIds,
          fetchedCount: batchArticles.length,
          fetchTimeMs: Date.now() - chunkStart
        }
      });
    }

    const orderedArticles = articleIds
      .map(id => articles.find(article => article.id === id))
      .filter((article): article is Article => article !== undefined);

    logger.info('Batch fetch operation completed', {
      batchId: logContext.batchId,
      summary: {
        totalFetchTimeMs: Date.now() - startTime,
        requestedCount: articleIds.length,
        fetchedCount: orderedArticles.length,
        missingArticles: articleIds.filter(id => !articles.some(a => a.id === id)),
        articlesWithContent: orderedArticles.filter(a => Boolean(a.content)).length,
        averageFetchTimePerChunk: Math.round((Date.now() - startTime) / chunks.length)
      }
    });

    return orderedArticles;

  } catch (err) {
    const error = new ArticleError('Batch article fetch operation failed', {
      ...logContext,
      errorDetails: err instanceof Error ? {
        message: err.message,
        stack: err.stack
      } : 'Unknown error'
    });
    logger.error('Batch fetch operation failed', error);
    throw error;
  }
};

export const getFullArticle = async (userId: string, articleId: string): Promise<Article | null> => {
  try {
    const articleRef = doc(db, 'users', userId, 'articles', articleId);
    const articleDoc = await getDoc(articleRef);
    
    if (!articleDoc.exists()) {
      return null;
    }

    const data = articleDoc.data();
    
    // Try to get cached content first
    const cachedContent = await getCachedArticle(articleId);
    // If not in cache, use the content from Firestore
    const content = cachedContent || data.content;

    if (!content) {
      throw new Error('Article content is missing');
    }

    // Cache the content if we got it from Firestore
    if (!cachedContent && data.content) {
      await setCachedArticle(articleId, data.content);
    }

    const article: Article = {
      id: articleDoc.id,
      title: data.title,
      subtitle: data.subtitle,
      content, // Important: Add content here
      category: data.category || 'uncategorized',
      coverImage: data.coverImage,
      wordCount: data.wordCount || 0,
      readingTime: Math.ceil((data.wordCount || 0) / 200),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
      readCount: data.readCount || 0,
      progress: data.progress || {
        wordsRead: 0,
        lastPosition: 0,
        completed: false
      },
      sourceUrl: data.sourceUrl,
      lastRead: data.lastRead?.toDate() || null
    };

    return article;
  } catch (err) {
    logger.error('Failed to get full article', err as Error);
    throw err; // Rethrow to handle in component
  }
};

export const searchArticles = async (
  userId: string,
  term: string,
  options: SearchOptions
): Promise<{ items: Article[]; hasMore: boolean }> => {
  const metadata = await getArticleMetadata(userId);
  if (!metadata) {
    return { items: [], hasMore: false };
  }

  const searchLower = term.toLowerCase();
  const matchingItems = metadata.items
    .filter(item => item.title.toLowerCase().includes(searchLower));
  
  const startIndex = options.startAfter ? 
    matchingItems.findIndex(item => item.id === options.startAfter) + 1 : 0;
  const pageItems = matchingItems.slice(startIndex, startIndex + options.limit);

  const articles = await batchGetArticles(userId, pageItems.map(item => item.id));

  const nextPageItems = matchingItems.slice(
    startIndex + options.limit, 
    startIndex + options.limit * 2
  );
  if (nextPageItems.length > 0) {
    batchGetArticles(userId, nextPageItems.map(item => item.id))
      .catch(err => logger.warn('Failed to prefetch search results', err));
  }

  return {
    items: articles,
    hasMore: startIndex + options.limit < matchingItems.length
  };
};

export const getRandomArticle = async (userId: string): Promise<Article | null> => {
  try {
    const counterRef = doc(db, 'users', userId, 'counters', 'articles');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists() || !counterDoc.data()?.items?.length) {
      return null;
    }

    const items = counterDoc.data().items;
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];

    const articleRef = doc(db, 'users', userId, 'articles', randomItem.id);
    const articleDoc = await getDoc(articleRef);

    if (!articleDoc.exists()) {
      return null;
    }

    return {
      id: articleDoc.id,
      ...articleDoc.data()
    } as Article;
  } catch (err) {
    logger.error('Failed to get random article', err as Error);
    return null;
  }
};





