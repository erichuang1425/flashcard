import { collection, query, orderBy, limit, startAfter, getDocs, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FlashcardCounter, FlashcardMetadata, SearchMetadata } from '../types';

// Core: Primary search and filter logic for flashcard retrieval
export const getFlashcardMetadata = async (
  userId: string,
  pageSize: number = 20,
  pageNumber: number = 1,
  filters: SearchMetadata['filters'] = {}
): Promise<{ metadata: FlashcardMetadata[]; total: number }> => {
  try {
    const counterData = await getFlashcardCounterDoc(userId);
    if (!counterData) {
      return { metadata: [], total: 0 };
    }

    let allMetadata = counterData.items.map(item => ({
      id: item.id,
      word: item.word,
      categories: item.categories,
      nextReview: counterData.metadata.studyQueue?.find(q => q.cardId === item.id)?.nextReview || new Date(),
      difficulty: 0,
      state: counterData.metadata.studyQueue?.find(q => q.cardId === item.id)?.state || 'NEW'
    }));

    let filteredMetadata = allMetadata;
    if (filters) {
      filteredMetadata = allMetadata.filter((item) => {
        if (filters.categories?.length && !filters.categories.some(c => Object.keys(item.categories).includes(c))) {
          return false;
        }
        if (filters.difficulty !== undefined && item.difficulty !== filters.difficulty) {
          return false;
        }
        return true;
      });
    }

    filteredMetadata.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

    const total = filteredMetadata.length;
    const start = (pageNumber - 1) * pageSize;
    const end = start + pageSize;
    const paginatedMetadata = filteredMetadata.slice(start, end);

    return {
      metadata: paginatedMetadata,
      total
    };
  } catch (error) {
    console.error("Error fetching flashcard metadata: ", error);
    throw error;
  }
};

// Core functionality comment: Performs flashcard search with filters
export const searchFlashcards = async (
  userId: string,
  query: string,
  filters: SearchMetadata['filters'],
  limit: number = 20,
  skip: number = 0
): Promise<{ metadata: FlashcardMetadata[], total: number }> => {
  const counter = await getFlashcardCounterDoc(userId);
  if (!counter) return { metadata: [], total: 0 };

  const filteredCards = counter.items
    .filter(item => {
      if (query && !item.word.toLowerCase().includes(query.toLowerCase())) return false;
      if (filters.categories?.length && !filters.categories.some(c => Object.keys(item.categories).includes(c))) return false;
      return true;
    })
    .map(item => ({
      id: item.id,
      word: item.word,
      categories: item.categories,
      nextReview: counter.metadata.studyQueue?.find(q => q.cardId === item.id)?.nextReview || new Date(),
      difficulty: 0,
      state: counter.metadata.studyQueue?.find(q => q.cardId === item.id)?.state || 'NEW'
    }))
    .sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase())); // Add alphabetical sorting here

  const total = filteredCards.length;
  const paginatedCards = filteredCards.slice(skip, skip + limit);

  return {
    metadata: paginatedCards,
    total
  };
};

async function getFlashcardCounterDoc(userId: string): Promise<FlashcardCounter | null> {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) return null;
  
  const data = counterDoc.data() as FlashcardCounter;
  return {
    ...data,
    metadata: {
      ...data.metadata,
      queueLastUpdated: data.metadata.queueLastUpdated instanceof Timestamp ? data.metadata.queueLastUpdated.toDate() : data.metadata.queueLastUpdated || new Date(),
      lastStudied: data.metadata.lastStudied instanceof Timestamp ? data.metadata.lastStudied.toDate() : data.metadata.lastStudied || null,
      studyQueue: data.metadata.studyQueue.map(q => ({
        ...q,
        nextReview: q.nextReview instanceof Timestamp ? q.nextReview.toDate() : q.nextReview || new Date(),
        lastReviewed: q.lastReviewed instanceof Timestamp ? q.lastReviewed.toDate() : q.lastReviewed || undefined
      }))
    }
  };
}