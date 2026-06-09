import type { Flashcard } from '../types';

export interface LoadedStudyState {
  dueCards: Flashcard[];
  error: null;
}

/**
 * Convert a successful Firestore load into the Study page state. An empty due
 * list is a valid "all caught up" result; transport failures are handled by the
 * caller's catch branch.
 */
export const classifyLoadedStudyCards = (
  allCards: Flashcard[],
  now: Date = new Date()
): LoadedStudyState => ({
  dueCards: allCards.filter((card) => {
    if (!card.nextReview) return true;
    const reviewDate =
      card.nextReview instanceof Date
        ? card.nextReview
        : new Date(card.nextReview as unknown as string);
    return !Number.isNaN(reviewDate.getTime()) && reviewDate <= now;
  }),
  error: null,
});
