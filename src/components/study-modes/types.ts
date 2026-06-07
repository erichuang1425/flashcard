/**
 * Per-card outcome reported by the batch study modes (Matching, Crossword) so
 * the study page can run each reviewed card through the spaced-repetition
 * scheduler individually instead of only tracking an aggregate score.
 */
export interface BatchResult {
  /** The flashcard's id. */
  id: string;
  /** Whether the player answered this card correctly. */
  correct: boolean;
}
