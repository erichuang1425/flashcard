import { collection, doc, getDocs, query, where, writeBatch, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Flashcard } from '../types';

// Add these interfaces at the top of the file
interface ImportProgress {
  flashcards: number;
  articles: number;
  success: boolean;
  errors?: string[];
}

interface CategoryCounts {
  [key: string]: number;
}

interface FlashcardItem {
  id: string;
  title: string;
  updatedAt: Date;
}

interface MigrationResult {
  flashcards: number;
  articles: number;
  success: boolean;
  errors?: string[];
}

interface CounterItem {
  id: string;
  title: string;
  updatedAt: Date;
}

export const migrateCollectionIDs = async (userId: string): Promise<ImportProgress> => {
  const batch = writeBatch(db);
  const errors: string[] = [];
  
  try {
    // Migrate flashcards
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const flashcardsSnapshot = await getDocs(flashcardsRef);
    
    // Create items array with metadata
    const flashcardItems = flashcardsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().word,
      updatedAt: doc.data().lastReviewed?.toDate() || new Date()
    }));

    // Build index map
    const flashcardIndexMap: { [key: string]: number } = {};
    flashcardItems.forEach((item, index) => {
      flashcardIndexMap[item.id] = index;
    });
    
    // Track categories
    const flashcardCategories: CategoryCounts = {};
    flashcardsSnapshot.docs.forEach(doc => {
      const categories = doc.data().categories || [];
      categories.forEach((cat: string) => {
        if (cat) {
          flashcardCategories[cat] = (flashcardCategories[cat] || 0) + 1;
        }
      });
    });

    // Update flashcards counter
    const flashcardsCounterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    await setDoc(flashcardsCounterRef, {
      count: flashcardItems.length,
      items: flashcardItems,
      categories: flashcardCategories,
      indexMap: flashcardIndexMap,
      lastUpdated: new Date()
    }, { merge: true });

    // Migrate articles using same pattern
    const articlesRef = collection(db, 'users', userId, 'articles');
    const articlesSnapshot = await getDocs(articlesRef);
    
    const articleItems = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      updatedAt: doc.data().lastRead?.toDate() || new Date()
    }));

    const articleIndexMap: { [key: string]: number } = {};
    articleItems.forEach((item, index) => {
      articleIndexMap[item.id] = index;
    });

    const articleCategories: CategoryCounts = {};
    articlesSnapshot.docs.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        articleCategories[category] = (articleCategories[category] || 0) + 1;
      }
    });

    // Update articles counter
    const articlesCounterRef = doc(db, 'users', userId, 'counters', 'articles');
    await setDoc(articlesCounterRef, {
      count: articleItems.length,
      items: articleItems,
      categories: articleCategories,
      indexMap: articleIndexMap,
      lastUpdated: new Date()
    }, { merge: true });

    return {
      flashcards: flashcardItems.length,
      articles: articleItems.length,
      success: true,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error during migration:', error);
    return {
      flashcards: 0,
      articles: 0,
      success: false,
      errors: [(error as Error).message]
    };
  }
};

// Verification utility
export const verifyCollectionIDs = async (userId: string) => {
  try {
    // Verify flashcards
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const flashcardsSnapshot = await getDocs(flashcardsRef);
    const actualFlashcardIds = new Set(flashcardsSnapshot.docs.map(doc => doc.id));

    const flashcardsCounterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    // Get counter document directly instead of collection
    const counterDoc = await getDoc(flashcardsCounterRef);
    const counterData = counterDoc.data();
    const storedFlashcardIds = new Set(counterData?.items?.map((item: CounterItem) => item.id) || []);

    // Verify articles
    const articlesRef = collection(db, 'users', userId, 'articles');
    const articlesSnapshot = await getDocs(articlesRef);
    const actualArticleIds = new Set(articlesSnapshot.docs.map(doc => doc.id));

    const articlesCounterRef = doc(db, 'users', userId, 'counters', 'articles');
    // Get counter document directly instead of collection
    const articleCounterDoc = await getDoc(articlesCounterRef);
    const articleCounterData = articleCounterDoc.data();
    const storedArticleIds = new Set(articleCounterData?.items?.map((item: CounterItem) => item.id) || []);

    // Update the spreading of Sets to use Array.from()
    const missingFlashcardIds = Array.from(actualFlashcardIds)
      .filter(id => !storedFlashcardIds.has(id));
    const missingArticleIds = Array.from(actualArticleIds)
      .filter(id => !storedArticleIds.has(id));

    return {
      flashcards: {
        actual: actualFlashcardIds.size,
        stored: storedFlashcardIds.size,
        missing: missingFlashcardIds,
        indexMapValid: counterData?.indexMap && Object.keys(counterData.indexMap).length === storedFlashcardIds.size
      },
      articles: {
        actual: actualArticleIds.size,
        stored: storedArticleIds.size,
        missing: missingArticleIds,
        indexMapValid: articleCounterData?.indexMap && Object.keys(articleCounterData.indexMap).length === storedArticleIds.size
      },
      isValid: missingFlashcardIds.length === 0 && missingArticleIds.length === 0
    };
  } catch (error) {
    console.error('Error verifying collections:', error);
    throw error;
  }
};