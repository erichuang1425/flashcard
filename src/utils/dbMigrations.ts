
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const migrateFlashcardsSchema = async (userId: string) => {
  try {
    const batch = writeBatch(db);
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const snapshot = await getDocs(flashcardsRef);
    let updatesNeeded = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!('exampleSentence' in data)) {
        batch.update(doc.ref, {
          exampleSentence: null
        });
        updatesNeeded++;
      }
    });

    if (updatesNeeded > 0) {
      await batch.commit();
      console.log(`Migrated ${updatesNeeded} flashcards to include exampleSentence field`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};