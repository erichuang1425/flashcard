import { collection, getDocs, writeBatch, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_CONFIG } from '../utils/spaced-repetition';

export const migrateSRSFields = async (userId: string) => {
  let batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Only migrate if needed and preserve existing SRS fields if present
    const updates: any = {};

    // Handle mastered field migration
    if ('mastered' in data) {
      updates.mastered = deleteField();
      updates.state = data.mastered ? 'REVIEW' : (data.state || 'NEW');
      updates.interval = data.mastered ? 21 : (data.interval || 0); // Set mastered cards to 21 days interval
    }

    // Add missing SRS fields with safe defaults
    if (!data.state) updates.state = 'NEW';
    if (!data.interval) updates.interval = 0;
    if (!data.easeFactor) updates.easeFactor = DEFAULT_CONFIG.startingEase;
    if (!data.lapseCount) updates.lapseCount = 0;
    if (!data.reviews) updates.reviews = 0;
    if (!data.lastReviewed) updates.lastReviewed = null;
    if (!data.nextReview) updates.nextReview = new Date();
    if (!data.successRate) updates.successRate = 100;

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }

    // Firebase has a limit of 500 operations per batch
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

export const migrateLegacyMasteryToSRS = async (userId: string) => {
  const batch = writeBatch(db);
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  const snapshot = await getDocs(flashcardsRef);
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if ('mastered' in data) {
      batch.update(doc.ref, {
        state: data.mastered ? 'REVIEW' : (data.state || 'NEW'),
        difficulty: data.mastered ? 2 : (data.difficulty || 3),
        interval: data.interval || 0,
        easeFactor: data.easeFactor || DEFAULT_CONFIG.startingEase,
        mastered: deleteField()
      });
      count++;
    }

    if (count >= 400) {
      await batch.commit();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return snapshot.size;
};