import { collection, doc, getDocs, query, where, writeBatch, arrayUnion, setDoc, getDoc, deleteField, increment, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Flashcard, StudyQueue } from '../types';
import { DEFAULT_CONFIG } from './spaced-repetition';
import { logger } from '../services/logging';
import { sortStudyQueueWithPerformance } from '../utils/queue-utils'
import { QueueItemPerformance } from '../types';

interface ImportProgress {
  flashcards: number;
  articles: number;
  success: boolean;
  errors?: string[];
}

interface VerificationState {
  flashcards: {
    actual: number;
    stored: number;
    missing: string[];
    indexMapValid?: boolean;
  };
  articles: {
    actual: number;
    stored: number;
    missing: string[];
    indexMapValid?: boolean;
  };
  isValid: boolean;
}

interface CategoryCounts {
  [key: string]: number;
}

interface FlashcardItem {
  id: string;
  word: string;
  categories?: string[];
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

interface MigrationType {
  flashcards: boolean;
  articles: boolean;
}

interface MigrationVersion {
  version: number;
  lastUpdated: Date;
  migrations: {
    srsUpdate?: boolean;
  };
  queuePerformanceMigration?: boolean;
}

export const checkAndRunMigrations = async (userId: string) => {
  const versionRef = doc(db, 'users', userId, 'system', 'migrations');
  
  try {
    const versionDoc = await getDoc(versionRef);
    const currentVersion = versionDoc.exists() ? versionDoc.data() as MigrationVersion : null;

    logger.info(`Checking migrations for user ${userId}`);

    if (!currentVersion || !currentVersion.migrations?.srsUpdate) {
      logger.info('SRS mechanism migration needed, starting migration...');
      
      await migrateSRSMechanism(userId);
      
      await setDoc(versionRef, {
        version: 1,
        lastUpdated: new Date(),
        migrations: {
          ...currentVersion?.migrations,
          srsUpdate: true
        }
      }, { merge: true });

      logger.info('SRS mechanism migration completed successfully');
    } else {
      logger.info('SRS mechanism already up to date');
    }

    await initializeMigrations(userId);
    await migrateToQueueSystem(userId);

  } catch (error) {
    logger.error('Migration check failed:', error as Error);
    throw error;
  }
};

export const migrateCollectionIDs = async (userId: string, types: MigrationType = { flashcards: true, articles: true }): Promise<ImportProgress> => {
  const batch = writeBatch(db);
  const errors: string[] = [];
  
  try {
    let flashcardCount = 0;
    let articleCount = 0;

    if (types.flashcards) {
      const flashcardsRef = collection(db, 'users', userId, 'flashcards');
      const flashcardsSnapshot = await getDocs(flashcardsRef);
      
      const flashcardItems = flashcardsSnapshot.docs.map(doc => ({
        id: doc.id,
        word: doc.data().word,
        category: doc.data().categories?.[0],
        updatedAt: doc.data().lastReviewed?.toDate() || new Date()
      }));

      const flashcardsCounterRef = doc(db, 'users', userId, 'counters', 'flashcards');
      await setDoc(flashcardsCounterRef, {
        count: flashcardItems.length,
        items: flashcardItems,
        lastUpdated: new Date()
      }, { merge: true });

      flashcardCount = flashcardsSnapshot.docs.length;
    }

    if (types.articles) {
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

      const articlesCounterRef = doc(db, 'users', userId, 'counters', 'articles');
      await setDoc(articlesCounterRef, {
        count: articleItems.length,
        items: articleItems,
        categories: articleCategories,
        indexMap: articleIndexMap,
        lastUpdated: new Date()
      }, { merge: true });

      articleCount = articlesSnapshot.docs.length;
    }

    await batch.commit();
    
    return {
      flashcards: flashcardCount,
      articles: articleCount,
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

export const verifyCollectionIDs = async (userId: string, types: MigrationType = { flashcards: true, articles: true }) => {
  try {
    const verification: VerificationState = {
      flashcards: { actual: 0, stored: 0, missing: [] },
      articles: { actual: 0, stored: 0, missing: [] },
      isValid: true
    };

    if (types.flashcards) {
      const flashcardsRef = collection(db, 'users', userId, 'flashcards');
      const flashcardsSnapshot = await getDocs(flashcardsRef);
      const actualFlashcardIds = new Set(flashcardsSnapshot.docs.map(doc => doc.id));

      const flashcardsCounterRef = doc(db, 'users', userId, 'counters', 'flashcards');
      const counterDoc = await getDoc(flashcardsCounterRef);
      const counterData = counterDoc.data();
      const storedFlashcardIds = new Set(counterData?.items?.map((item: CounterItem) => item.id) || []);

      const missingFlashcardIds = Array.from(actualFlashcardIds)
        .filter(id => !storedFlashcardIds.has(id));

      verification.flashcards = {
        actual: actualFlashcardIds.size,
        stored: storedFlashcardIds.size,
        missing: missingFlashcardIds,
        indexMapValid: counterData?.indexMap && Object.keys(counterData.indexMap).length === storedFlashcardIds.size
      };
    }

    if (types.articles) {
      const articlesRef = collection(db, 'users', userId, 'articles');
      const articlesSnapshot = await getDocs(articlesRef);
      const actualArticleIds = new Set(articlesSnapshot.docs.map(doc => doc.id));

      const articlesCounterRef = doc(db, 'users', userId, 'counters', 'articles');
      const articleCounterDoc = await getDoc(articlesCounterRef);
      const articleCounterData = articleCounterDoc.data();
      const storedArticleIds = new Set(articleCounterData?.items?.map((item: CounterItem) => item.id) || []);

      const missingArticleIds = Array.from(actualArticleIds)
        .filter(id => !storedArticleIds.has(id));

      verification.articles = {
        actual: actualArticleIds.size,
        stored: storedArticleIds.size,
        missing: missingArticleIds,
        indexMapValid: articleCounterData?.indexMap && Object.keys(articleCounterData.indexMap).length === storedArticleIds.size
      };
    }

    verification.isValid = 
      (!types.flashcards || verification.flashcards.missing.length === 0) && 
      (!types.articles || verification.articles.missing.length === 0);

    return verification;
  } catch (error) {
    console.error('Error verifying collections:', error);
    throw error;
  }
};

export const initializeMigrations = async (userId: string) => {
  try {
    logger.info(`Starting regular migrations for user ${userId}`);
    
    await migrateFlashcardsSchema(userId);
    await migrateArticles(userId);
    await cleanupArticleFields(userId);
    await migrateSettings(userId);
    await updateCounterMetadata(userId);
    
    logger.info(`Completed regular migrations for user ${userId}`);
  } catch (error) {
    logger.error('Migration initialization failed:', error as Error);
    throw error;
  }
};

export const migrateSRSMechanism = async (userId: string) => {
  const settingsRef = doc(db, 'users', userId, 'preferences', 'settings');
  const settingsDoc = await getDoc(settingsRef);
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  const counterDoc = await getDoc(counterRef);

  try {
    logger.info('Starting SRS mechanism migration');
    
    let settingsUpdates = {};
    const data = settingsDoc.exists() ? settingsDoc.data() : {};

    if (!data.studySettings?.srsType) {
      settingsUpdates = {
        studySettings: {
          ...data.studySettings,
          srsType: 'position',
          defaultNewCardsPerDay: 20,
          defaultReviewsPerDay: 100
        }
      };
    }

    const batch = writeBatch(db);
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const snapshot = await getDocs(flashcardsRef);
    let updateCount = 0;
    let metadataUpdates = {
      progressStats: { new: 0, learning: 0, review: 0, relearn: 0 },
      totalCards: 0,
      reviewsDue: 0
    };

    const updatedItems = [];

    for (const doc of snapshot.docs) {
      const cardData = doc.data();
      const changes: any = {};

      if (!('position' in cardData)) {
        changes.position = cardData.interval || 0;
      }
      if (!('interval' in cardData)) {
        changes.interval = Math.floor(cardData.position || 0);
      }
      if (!('totalReviews' in cardData)) {
        changes.totalReviews = cardData.reviews || 0;
      }

      const state = cardData.state?.toLowerCase() as 'new' | 'learning' | 'review' | 'relearn';
      if (state in metadataUpdates.progressStats) {
        metadataUpdates.progressStats[state]++;
      }
      if (cardData.nextReview?.toDate() <= new Date()) {
        metadataUpdates.reviewsDue++;
      }

      updatedItems.push({
        id: doc.id,
        word: cardData.word,
        state: cardData.state,
        position: changes.position || cardData.position,
        interval: changes.interval || cardData.interval,
        nextReview: cardData.nextReview,
        updatedAt: cardData.lastReviewed?.toDate() || new Date()
      });

      if (Object.keys(changes).length > 0) {
        batch.update(doc.ref, changes);
        updateCount++;
      }
    }

    const counterUpdates = {
      items: updatedItems,
      metadata: {
        ...counterDoc.data()?.metadata,
        ...metadataUpdates
      },
      lastUpdated: new Date()
    };

    if (Object.keys(settingsUpdates).length > 0) {
      await setDoc(settingsRef, settingsUpdates, { merge: true });
      logger.info(`Migrated SRS mechanism settings for user ${userId}`);
    }

    if (updateCount > 0) {
      await batch.commit();
      logger.info(`Updated ${updateCount} flashcard documents with SRS mechanism fields`);
    }

    await setDoc(counterRef, counterUpdates, { merge: true });
    logger.info(`Updated flashcard counter metadata for user ${userId}`);

    logger.info('SRS migration completed successfully');
    return true;
  } catch (error) {
    logger.error('SRS mechanism migration failed:', error as Error);
    throw error;
  }
};

export const migrateSRSFields = async (userId: string) => {
  let batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: any = {};

    if (!('state' in data)) updates.state = 'NEW';
    if (!('interval' in data)) updates.interval = 0;
    if (!('easeFactor' in data)) updates.easeFactor = DEFAULT_CONFIG.startingEase;
    if (!('lapseCount' in data)) updates.lapseCount = 0;
    if (!('reviews' in data)) updates.reviews = 0;
    if (!('successRate' in data)) updates.successRate = 100;
    if (!('nextReview' in data)) updates.nextReview = new Date();
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }

    if (count >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return snapshot.size;
};

export const migrateFlashcardsSchema = async (userId: string) => {
  const batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);
  let updateCount = 0;

  try {
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let changes: any = {};

      if (!('state' in data)) changes.state = 'NEW';
      if (!('interval' in data)) changes.interval = 0;
      if (!('easeFactor' in data)) changes.easeFactor = DEFAULT_CONFIG.startingEase;
      if (!('reviews' in data)) changes.reviews = 0;
      if (!('lapseCount' in data)) changes.lapseCount = 0;
      if (!('successRate' in data)) changes.successRate = 100;
      if (!('nextReview' in data)) changes.nextReview = new Date();
      if (!('categories' in data)) changes.categories = [];

      if ('mastered' in data) {
        changes.state = data.mastered ? 'REVIEW' : 'NEW';
        changes.mastered = deleteField();
      }

      if (Object.keys(changes).length > 0) {
        batch.update(doc.ref, changes);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      logger.info(`Migrated ${updateCount} flashcards for user ${userId}`);
    }
  } catch (error) {
    logger.error('Flashcard migration failed:', error as Error);
    throw error;
  }
};

export const migrateArticles = async (userId: string) => {
  const batch = writeBatch(db);
  const articlesRef = collection(db, 'users', userId, 'articles');
  const snapshot = await getDocs(articlesRef);
  let updateCount = 0;

  try {
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let changes: any = {};
      
      if (!data.progress) {
        changes.progress = {
          completed: false,
          reviewCount: 0
        };
      } else {
        changes.progress = {
          completed: data.progress.completed || false,
          reviewCount: data.progress.reviewCount || 0
        };
      }

      if (Object.keys(changes).length > 0) {
        batch.update(doc.ref, changes);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      logger.info(`Migrated ${updateCount} articles for user ${userId}`);
    }
  } catch (error) {
    logger.error('Article migration failed:', error as Error);
    throw error;
  }
};

export const updateCounterMetadata = async (userId: string) => {
  try {
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const flashcardsSnapshot = await getDocs(flashcardsRef);
    
    const flashcardItems = flashcardsSnapshot.docs.map(doc => ({
      id: doc.id,
      word: doc.data().word,
      updatedAt: doc.data().lastReviewed?.toDate() || new Date()
    }));

    const articlesRef = collection(db, 'users', userId, 'articles');
    const articlesSnapshot = await getDocs(articlesRef);
    
    const articleItems = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      updatedAt: doc.data().lastAccessed?.toDate() || new Date()
    }));

    const batch = writeBatch(db);
    
    batch.set(doc(db, 'users', userId, 'counters', 'flashcards'), {
      items: flashcardItems,
      lastUpdated: new Date()
    }, { merge: true });

    batch.set(doc(db, 'users', userId, 'counters', 'articles'), {
      items: articleItems,
      lastUpdated: new Date()
    }, { merge: true });

    await batch.commit();
    logger.info(`Updated basic counter data for user ${userId}`);

  } catch (error) {
    logger.error('Counter update failed:', error as Error);
    throw error;
  }
};

export const migrateSettings = async (userId: string) => {
  const settingsRef = doc(db, 'users', userId, 'preferences', 'settings'); 
  const settingsDoc = await getDoc(settingsRef);

  try {
    let updates = {};

    if (!settingsDoc.exists()) {
      updates = {
        theme: 'system',
        language: 'en',
        readingSettings: {
          fontSize: 16,
          lineHeight: 1.6,
          fontFamily: 'system-ui',
        },
        studySettings: {
          sessionLength: 20,
          vocabLimit: 20
        }
      };
    } else {
      const data = settingsDoc.data();
      const cleanSettings = {
        theme: data.theme || 'system',
        language: data.language || 'en',
        readingSettings: {
          fontSize: data.readingSettings?.fontSize || 16,
          lineHeight: data.readingSettings?.lineHeight || 1.6,
          fontFamily: data.readingSettings?.fontFamily || 'system-ui',
        },
        studySettings: {
          sessionLength: data.studySettings?.sessionLength || 20,
          vocabLimit: data.studySettings?.vocabLimit || 20
        }
      };

      if (JSON.stringify(data) !== JSON.stringify(cleanSettings)) {
        updates = cleanSettings;
      }
    }

    if (Object.keys(updates).length > 0) {
      await setDoc(settingsRef, updates, { merge: true });
      logger.info(`Migrated settings for user ${userId}`);
    }
  } catch (error) {
    logger.error('Settings migration failed:', error as Error);
    throw error;
  }
};

export const cleanupArticleFields = async (userId: string) => {
  const batch = writeBatch(db);
  const articlesRef = collection(db, 'users', userId, 'articles');
  const snapshot = await getDocs(articlesRef);
  let updates = 0;

  try {
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let changes: any = {};
      
      if (data.progress) {
        changes.progress = {
          completed: data.progress.completed || false,
          reviewCount: data.progress.reviewCount || 0
        };
      }

      if ('mastered' in data) {
        changes.mastered = deleteField();
      }

      if (Object.keys(changes).length > 0) {
        batch.update(doc.ref, changes);
        updates++;
      }
    }

    if (updates > 0) {
      await batch.commit();
      logger.info(`Cleaned up ${updates} article documents for user ${userId}`);
    }
  } catch (error) {
    logger.error('Article cleanup failed:', error as Error);
    throw error;
  }
};

export const migrateFlashcardsPosition = async (userId: string) => {
  const batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);
  let updateCount = 0;

  try {
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      
      if (aData.state === 'RELEARN' && bData.state !== 'RELEARN') return -1;
      if (bData.state === 'RELEARN' && aData.state !== 'RELEARN') return 1;
      if (aData.state === 'NEW' && bData.state !== 'NEW') return -1;
      if (bData.state === 'NEW' && aData.state !== 'NEW') return 1;
      
      const aNext = aData.nextReview?.toDate() || new Date();
      const bNext = bData.nextReview?.toDate() || new Date();
      return aNext.getTime() - bNext.getTime();
    });

    sortedDocs.forEach((doc, index) => {
      batch.update(doc.ref, { position: index });
      updateCount++;
    });

    if (updateCount > 0) {
      await batch.commit();
      logger.info(`Added position field to ${updateCount} flashcards for user ${userId}`);
    }
  } catch (error) {
    logger.error('Position migration failed:', error as Error);
    throw error;
  }
};

export const migrateToQueueSystem = async (userId: string) => {
  const versionRef = doc(db, 'users', userId, 'system', 'migrations');
  const versionDoc = await getDoc(versionRef);
  
  if (versionDoc.exists() && versionDoc.data()?.queueMigration) {
    return;
  }

  try {
    logger.info('Starting queue system migration');
    
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const snapshot = await getDocs(flashcardsRef);
    
    const studyQueue = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          cardId: doc.id,
          nextPosition: data.position || 0,
          state: data.state || 'NEW',
          interval: data.interval || 0,
          easeFactor: data.easeFactor || DEFAULT_CONFIG.startingEase,
          nextReview: data.nextReview?.toDate() || new Date()
        } as StudyQueue;
      })
      .sort((a, b) => {
        if (a.state === 'RELEARN' && b.state !== 'RELEARN') return -1;
        if (b.state === 'RELEARN' && a.state !== 'RELEARN') return 1;
        if (a.state === 'NEW' && b.state !== 'NEW') return -1;
        if (b.state === 'NEW' && a.state !== 'NEW') return 1;
        return a.nextPosition - b.nextPosition;
      });

    const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    await updateDoc(counterRef, {
      'metadata.studyQueue': studyQueue,
      'metadata.queueLastUpdated': new Date()
    });

    await setDoc(versionRef, {
      queueMigration: true,
      lastUpdated: new Date()
    }, { merge: true });

    logger.info('Queue system migration completed');
  } catch (error) {
    logger.error('Queue system migration failed:', error as Error);
    throw error;
  }
};

export const migrateSRSType = async (userId: string) => {
  let batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);
  let updateCount = 0;
  const allCategories = new Set<string>();
  const itemsToAdd: FlashcardItem[] = [];
  const queueItems: StudyQueue[] = [];

  try {
    const settingsDoc = await getDoc(doc(db, 'users', userId, 'preferences', 'settings'));
    const srsType = settingsDoc.data()?.studySettings?.srsType || 'interval';

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const changes: any = {};
      const categories: string[] = data.categories || [];
      categories.forEach((cat: string) => allCategories.add(cat));

      if ('mastered' in data) changes.mastered = deleteField();
      if ('position' in data) changes.position = deleteField();
      if ('lapseCount' in data) changes.lapseCount = deleteField();
      if ('mature' in data) changes.mature = deleteField();

      if (!data.srsType) {
        changes.srsType = srsType;
        changes.interval = data.interval || 0;
        changes.easeFactor = data.easeFactor || DEFAULT_CONFIG.startingEase;
      }

      queueItems.push({
        cardId: doc.id,
        state: data.state || 'NEW',
        interval: data.interval || 0,
        position: data.position || 0,
        easeFactor: data.easeFactor || DEFAULT_CONFIG.startingEase,
        nextReview: data.nextReview?.toDate() || new Date(),
        srsType,
        nextPosition: data.position || 0
      });

      itemsToAdd.push({
        id: doc.id,
        word: data.word,
        categories: categories,
        updatedAt: data.lastReviewed?.toDate() || new Date()
      });

      if (Object.keys(changes).length > 0) {
        batch.update(doc.ref, changes);
        updateCount++;
      }

      if (updateCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        updateCount = 0;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
    }

    const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    await setDoc(counterRef, {
      count: snapshot.size,
      items: itemsToAdd,
      categories: Array.from(allCategories),
      indexMap: Object.fromEntries(itemsToAdd.map((item, idx) => [item.id, idx])),
      lastUpdated: new Date(),
      metadata: {
        studyQueue: queueItems,
        queueLastUpdated: new Date(),
        totalMastered: queueItems.filter(item => item.state === 'REVIEW').length,
        lastStudied: null,
        averageAccuracy: 0,
        reviewsDue: 0,
        categoriesCount: allCategories.size,
        progressStats: {
          new: queueItems.filter(item => item.state === 'NEW').length,
          learning: queueItems.filter(item => item.state === 'LEARNING').length,
          review: queueItems.filter(item => item.state === 'REVIEW').length,
          relearn: queueItems.filter(item => item.state === 'RELEARN').length,
        }
      }
    }, { merge: true });

    const versionRef = doc(db, 'users', userId, 'system', 'migrations');
    await setDoc(versionRef, {
      srsTypeMigration: true,
      lastUpdated: new Date()
    }, { merge: true });

    logger.info(`Completed SRS type migration for user ${userId}`);
  } catch (error) {
    logger.error('SRS type migration failed:', error as Error);
    throw error;
  }
};

export const migrateQueuePerformanceTracking = async (userId: string) => {
  const versionRef = doc(db, 'users', userId, 'system', 'migrations');
  const versionDoc = await getDoc(versionRef);
  
  if (versionDoc.exists() && versionDoc.data()?.queuePerformanceMigration) {
    return;
  }

  try {
    logger.info('Starting queue performance tracking migration');
    const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) return;

    const metadata = counterDoc.data()?.metadata;
    let queue = metadata?.studyQueue || [];

    queue = queue.map((item: StudyQueue) => ({
      ...item,
      performance: {
        totalAttempts: 0,
        correctAttempts: 0,
        lastAttempts: [],
        averageInterval: item.interval || 0,
        streakCount: 0
      } as QueueItemPerformance
    }));

    await updateDoc(counterRef, {
      'metadata.studyQueue': queue,
      'metadata.queueStats': {
        lastOptimized: new Date(),
        stateDistribution: {
          new: queue.filter((i: StudyQueue) => i.state === 'NEW').length,
          learning: queue.filter((i: StudyQueue) => i.state === 'LEARNING').length,
          review: queue.filter((i: StudyQueue) => i.state === 'REVIEW').length,
          relearn: queue.filter((i: StudyQueue) => i.state === 'RELEARN').length
        },
        performanceMetrics: {
          averageSuccessRate: 0,
          totalReviews: 0,
          averageInterval: 0
        }
      }
    });

    await setDoc(versionRef, {
      queuePerformanceMigration: true,
      lastUpdated: new Date()
    }, { merge: true });

    logger.info('Queue performance tracking migration completed');
  } catch (error) {
    logger.error('Queue performance tracking migration failed:', error as Error);
    throw error;
  }
};

export const migrateQueueEnhancements = async (userId: string) => {
  const versionRef = doc(db, 'users', userId, 'system', 'migrations');
  const versionDoc = await getDoc(versionRef);
  
  if (versionDoc.exists() && versionDoc.data()?.queueEnhancementsMigration) {
    return;
  }

  try {
    logger.info('Starting queue enhancements migration');
    const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) return;

    const metadata = counterDoc.data()?.metadata;
    let queue = metadata?.studyQueue || [];
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');

    const performanceData = new Map<string, {
      totalReviews: number,
      correctReviews: number,
      lastReviewed: Date | null
    }>();

    const snapshot = await getDocs(flashcardsRef);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      performanceData.set(doc.id, {
        totalReviews: data.reviews || 0,
        correctReviews: data.totalCorrect || 0,
        lastReviewed: data.lastReviewed?.toDate() || null
      });
    });

    queue = queue.map((item: StudyQueue, index: number) => {
      const performance = performanceData.get(item.cardId);
      
      return {
        ...item,
        lastReviewed: performance?.lastReviewed || null,
        consecutive: 0,
        position: calculateInitialPosition(item, performance, index),
      };
    });

    queue = sortStudyQueueWithPerformance(queue);

    await updateDoc(counterRef, {
      'metadata.studyQueue': queue,
      'metadata.queueLastUpdated': new Date(),
      'metadata.queueStats': {
        lastOptimized: new Date(),
        stateStats: calculateStateStats(queue),
        averageIntervals: calculateAverageIntervals(queue)
      }
    });

    await setDoc(versionRef, {
      queueEnhancementsMigration: true,
      lastUpdated: new Date()
    }, { merge: true });

    logger.info('Queue enhancements migration completed');
  } catch (error) {
    logger.error('Queue enhancements migration failed:', error as Error);
    throw error;
  }
};

const calculateInitialPosition = (
  item: StudyQueue,
  performance: { totalReviews: number; correctReviews: number } | undefined,
  currentIndex: number
): number => {
  if (!performance) return currentIndex;

  const successRate = performance.totalReviews > 0
    ? (performance.correctReviews / performance.totalReviews) * 100
    : 0;

  switch (item.state) {
    case 'RELEARN':
      return 0;
    case 'LEARNING':
      return currentIndex;
    case 'REVIEW':
      return successRate >= 80 ? currentIndex + 5 : currentIndex;
    case 'NEW':
      return successRate >= 70 ? currentIndex + 3 : currentIndex + 1;
    default:
      return currentIndex;
  }
};

const calculateStateStats = (queue: StudyQueue[]) => {
  const stats = {
    new: { count: 0, avgPosition: 0 },
    learning: { count: 0, avgPosition: 0 },
    review: { count: 0, avgPosition: 0 },
    relearn: { count: 0, avgPosition: 0 }
  };

  queue.forEach((item, index) => {
    const state = item.state.toLowerCase() as keyof typeof stats;
    stats[state].count++;
    stats[state].avgPosition += index;
  });

  Object.values(stats).forEach(stat => {
    stat.avgPosition = stat.count > 0 ? stat.avgPosition / stat.count : 0;
  });

  return stats;
};

const calculateAverageIntervals = (queue: StudyQueue[]) => {
  const intervals = {
    learning: [] as number[],
    review: [] as number[]
  };

  queue.forEach(item => {
    if (item.state === 'LEARNING') {
      intervals.learning.push(item.interval);
    } else if (item.state === 'REVIEW') {
      intervals.review.push(item.interval);
    }
  });

  return {
    learning: intervals.learning.length 
      ? intervals.learning.reduce((a, b) => a + b, 0) / intervals.learning.length 
      : 0,
    review: intervals.review.length 
      ? intervals.review.reduce((a, b) => a + b, 0) / intervals.review.length 
      : 0
  };
};
