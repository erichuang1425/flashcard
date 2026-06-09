/**
 * Pure, UI-free logic shared by the study modes. Keeping the answer-checking,
 * option-building and scoring here (rather than inline in the components) lets
 * the core learning loop be unit-tested without rendering React — wrong
 * answer-matching or scoring directly harms learners, so it's the highest-value
 * logic to cover.
 */
import type { Flashcard } from '../../types';
import type { CrosswordCell, PlacedEntry } from '../../utils/crossword';
import { normalizeAnswer, shuffle as defaultShuffle } from '../../utils/helpers';
import type { BatchResult } from './types';

// ---------------------------------------------------------------------------
// Fill in the blanks
// ---------------------------------------------------------------------------

/**
 * Whether a typed answer matches the target word. Comparison is forgiving:
 * case-, whitespace- and accent-insensitive (see `normalizeAnswer`), so
 * "Café" counts as "cafe".
 */
export const isFillInBlankCorrect = (answer: string, word: string): boolean =>
  normalizeAnswer(answer) === normalizeAnswer(word);

// ---------------------------------------------------------------------------
// Multiple choice
// ---------------------------------------------------------------------------

export type MultipleChoiceDirection = 'wordToMeaning' | 'meaningToWord';

/** Total number of options shown (the correct card plus distractors). */
export const MC_NUM_OPTIONS = 4;

/**
 * Build the answer choices for a multiple-choice question from real cards in
 * the deck. Distractors that share the part of speech are preferred (harder,
 * more meaningful) before falling back to any other card, and options are
 * deduped on the field the learner actually reads so two choices never show
 * identical text. `shuffle` is injectable so tests can pass a deterministic
 * ordering.
 */
export const buildMultipleChoiceOptions = (
  card: Flashcard,
  deck: Flashcard[],
  direction: MultipleChoiceDirection,
  shuffle: <T>(array: T[]) => T[] = defaultShuffle
): Flashcard[] => {
  // In each direction, dedupe on the field the user actually reads.
  const keyOf = (c: Flashcard) =>
    (direction === 'wordToMeaning' ? c.englishDefinition : c.word)?.toLowerCase().trim();

  const seen = new Set([keyOf(card)]);
  const pickFrom = (cards: Flashcard[]) =>
    cards.filter((c) => {
      const key = keyOf(c);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const others = deck.filter((c) => c.id !== card.id);
  const samePos = others.filter((c) => c.partOfSpeech === card.partOfSpeech);

  const distractors = [
    ...shuffle(pickFrom(samePos)),
    ...shuffle(pickFrom(others)),
  ].slice(0, MC_NUM_OPTIONS - 1);

  return shuffle([card, ...distractors]);
};

// ---------------------------------------------------------------------------
// Matching game
// ---------------------------------------------------------------------------

export type MatchSide = 'word' | 'definition';

export interface MatchSelection {
  cardId: string;
  side: MatchSide;
}

/**
 * Whether the currently-selected item and a newly-clicked item form a valid
 * pair: the same card shown on opposite sides (a word and its definition).
 */
export const isMatchingPair = (
  selection: MatchSelection,
  cardId: string,
  side: MatchSide
): boolean => selection.side !== side && selection.cardId === cardId;

// ---------------------------------------------------------------------------
// Crossword (fill-in puzzle)
// ---------------------------------------------------------------------------

/** Uppercase a word and drop everything that isn't a letter (matches the grid). */
export const sanitizeWord = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z]/g, '');

/** Grid-cell lookup key. */
export const cellKey = (row: number, col: number): string => `${row},${col}`;

/**
 * Whether every cell of a placed word has been filled in with its correct
 * letter. `entries` maps a cell key to the letter the player typed; `cellMap`
 * maps a cell key to the solution cell.
 */
export const isWordSolved = (
  word: PlacedEntry,
  entries: Record<string, string>,
  cellMap: Map<string, CrosswordCell>
): boolean => {
  const length = sanitizeWord(word.answer).length;
  for (let i = 0; i < length; i++) {
    const row = word.direction === 'across' ? word.row : word.row + i;
    const col = word.direction === 'across' ? word.col + i : word.col;
    const cell = cellMap.get(cellKey(row, col));
    if (!cell || (entries[cellKey(row, col)] || '') !== cell.letter) {
      return false;
    }
  }
  return true;
};

/**
 * Build a per-card result for every placed word so each is scheduled by the
 * spaced-repetition system according to whether the player got it right. Words
 * whose owning card can't be resolved are dropped.
 */
export const buildPuzzleResults = (
  placed: PlacedEntry[],
  idByAnswer: Map<string, string>,
  entries: Record<string, string>,
  cellMap: Map<string, CrosswordCell>
): BatchResult[] =>
  placed
    .map((word) => {
      const id = idByAnswer.get(sanitizeWord(word.answer));
      return id ? { id, correct: isWordSolved(word, entries, cellMap) } : null;
    })
    .filter((r): r is BatchResult => r !== null);
