import type { Flashcard } from './index';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

export interface FlashcardsResponse {
  cards: Flashcard[];
  lastDoc: QueryDocumentSnapshot | null;
}