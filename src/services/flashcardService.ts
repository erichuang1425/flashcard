import { collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

interface FlashcardPreview {
  id: string;
  word: string;
}

/**
 * Fetch flashcards that are due for review or, if none are due, the most recently added ones.
 * Returns a list of simple flashcard previews containing id and word.
 */
export const getRecentOrDueFlashcards = async (
  userId: string,
  count: number = 10
): Promise<FlashcardPreview[]> => {
  const cardsRef = collection(db, 'users', userId, 'flashcards');
  const now = new Date();

  // Try to fetch due cards first
  const dueQuery = query(
    cardsRef,
    where('nextReview', '<=', now),
    orderBy('nextReview', 'asc'),
    limit(count)
  );
  const dueSnapshot = await getDocs(dueQuery);
  const dueCards: FlashcardPreview[] = dueSnapshot.docs.map(doc => ({ id: doc.id, word: doc.data().word }));

  if (dueCards.length >= count) {
    return dueCards;
  }

  // If not enough due cards, fetch the most recent ones to fill the remainder
  const remaining = count - dueCards.length;
  const recentQuery = query(cardsRef, orderBy('created', 'desc'), limit(remaining));
  const recentSnapshot = await getDocs(recentQuery);
  const recentCards: FlashcardPreview[] = recentSnapshot.docs
    .map(doc => ({ id: doc.id, word: doc.data().word }))
    .filter(card => !dueCards.some(d => d.id === card.id));

  return [...dueCards, ...recentCards];
};

