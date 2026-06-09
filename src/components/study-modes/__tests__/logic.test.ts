import type { Flashcard } from '../../../types';
import type { CrosswordCell, PlacedEntry } from '../../../utils/crossword';
import { generateCrossword } from '../../../utils/crossword';
import {
  isFillInBlankCorrect,
  buildMultipleChoiceOptions,
  MC_NUM_OPTIONS,
  isMatchingPair,
  sanitizeWord,
  cellKey,
  isWordSolved,
  buildPuzzleResults,
} from '../logic';

// A deterministic "shuffle" so option ordering is predictable in assertions.
const identity = <T>(array: T[]): T[] => [...array];

const makeCard = (over: Partial<Flashcard> & { id: string }): Flashcard => ({
  userId: 'u1',
  word: 'word',
  partOfSpeech: 'noun',
  englishDefinition: 'a definition',
  difficulty: 1,
  categories: [],
  created: new Date(0),
  nextReview: new Date(0),
  mastered: false,
  ...over,
});

describe('isFillInBlankCorrect', () => {
  it('accepts an exact match', () => {
    expect(isFillInBlankCorrect('apple', 'apple')).toBe(true);
  });

  it('is forgiving of case, surrounding whitespace and accents', () => {
    expect(isFillInBlankCorrect('  Café ', 'cafe')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(isFillInBlankCorrect('banana', 'apple')).toBe(false);
  });
});

describe('buildMultipleChoiceOptions', () => {
  const card = makeCard({ id: 'c1', word: 'cat', englishDefinition: 'a feline', partOfSpeech: 'noun' });
  const deck = [
    card,
    makeCard({ id: 'c2', word: 'dog', englishDefinition: 'a canine', partOfSpeech: 'noun' }),
    makeCard({ id: 'c3', word: 'run', englishDefinition: 'to move fast', partOfSpeech: 'verb' }),
    makeCard({ id: 'c4', word: 'bird', englishDefinition: 'a flying animal', partOfSpeech: 'noun' }),
    makeCard({ id: 'c5', word: 'fish', englishDefinition: 'a swimming animal', partOfSpeech: 'noun' }),
  ];

  it('always includes the correct card', () => {
    const options = buildMultipleChoiceOptions(card, deck, 'wordToMeaning', identity);
    expect(options.some((o) => o.id === 'c1')).toBe(true);
  });

  it('returns at most MC_NUM_OPTIONS choices', () => {
    const options = buildMultipleChoiceOptions(card, deck, 'wordToMeaning', identity);
    expect(options.length).toBe(MC_NUM_OPTIONS);
  });

  it('prefers same-part-of-speech distractors before others', () => {
    // With identity shuffle, same-POS (noun) cards come first, so the lone verb
    // ("run") should be squeezed out of the 4 slots.
    const options = buildMultipleChoiceOptions(card, deck, 'wordToMeaning', identity);
    expect(options.some((o) => o.id === 'c3')).toBe(false);
  });

  it('never produces two options with the same displayed text', () => {
    const dupDeck = [
      card,
      makeCard({ id: 'dup', word: 'feline', englishDefinition: 'a feline', partOfSpeech: 'noun' }),
      makeCard({ id: 'c2', word: 'dog', englishDefinition: 'a canine', partOfSpeech: 'noun' }),
    ];
    const options = buildMultipleChoiceOptions(card, dupDeck, 'wordToMeaning', identity);
    const defs = options.map((o) => o.englishDefinition);
    expect(new Set(defs).size).toBe(defs.length);
    // The duplicate definition card must be excluded.
    expect(options.some((o) => o.id === 'dup')).toBe(false);
  });

  it('dedupes on the word in the meaningToWord direction', () => {
    const dupDeck = [
      card,
      makeCard({ id: 'dup', word: 'cat', englishDefinition: 'another cat', partOfSpeech: 'noun' }),
      makeCard({ id: 'c2', word: 'dog', englishDefinition: 'a canine', partOfSpeech: 'noun' }),
    ];
    const options = buildMultipleChoiceOptions(card, dupDeck, 'meaningToWord', identity);
    expect(options.some((o) => o.id === 'dup')).toBe(false);
  });

  it('handles a deck smaller than the option count', () => {
    const tiny = [card, makeCard({ id: 'c2', word: 'dog', englishDefinition: 'a canine' })];
    const options = buildMultipleChoiceOptions(card, tiny, 'wordToMeaning', identity);
    expect(options.length).toBe(2);
    expect(options.some((o) => o.id === 'c1')).toBe(true);
  });
});

describe('isMatchingPair', () => {
  it('is a match for the same card on opposite sides', () => {
    expect(isMatchingPair({ cardId: 'c1', side: 'word' }, 'c1', 'definition')).toBe(true);
  });

  it('is not a match for the same card on the same side', () => {
    expect(isMatchingPair({ cardId: 'c1', side: 'word' }, 'c1', 'word')).toBe(false);
  });

  it('is not a match across different cards', () => {
    expect(isMatchingPair({ cardId: 'c1', side: 'word' }, 'c2', 'definition')).toBe(false);
  });
});

describe('sanitizeWord', () => {
  it('uppercases and strips non-letters', () => {
    expect(sanitizeWord("don't-stop")).toBe('DONTSTOP');
    expect(sanitizeWord('café 2!')).toBe('CAF');
  });
});

describe('cellKey', () => {
  it('formats a row,col key', () => {
    expect(cellKey(2, 3)).toBe('2,3');
  });
});

describe('isWordSolved', () => {
  // Build a small grid manually: "CAT" across at (0,0) and "DOG" down at (0,2).
  const cells: CrosswordCell[] = [
    { row: 0, col: 0, letter: 'C', number: 1 },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T', number: 2 },
    { row: 1, col: 2, letter: 'O' },
    { row: 2, col: 2, letter: 'G' },
  ];
  const cellMap = new Map(cells.map((c) => [cellKey(c.row, c.col), c]));
  const across: PlacedEntry = { answer: 'cat', clue: 'feline', row: 0, col: 0, direction: 'across', number: 1 };
  const down: PlacedEntry = { answer: 'tog', clue: 'down word', row: 0, col: 2, direction: 'down', number: 2 };

  it('is true when every across cell holds its solution letter', () => {
    const entries = { '0,0': 'C', '0,1': 'A', '0,2': 'T' };
    expect(isWordSolved(across, entries, cellMap)).toBe(true);
  });

  it('is true when every down cell holds its solution letter', () => {
    const entries = { '0,2': 'T', '1,2': 'O', '2,2': 'G' };
    expect(isWordSolved(down, entries, cellMap)).toBe(true);
  });

  it('is false when a letter is wrong', () => {
    const entries = { '0,0': 'C', '0,1': 'X', '0,2': 'T' };
    expect(isWordSolved(across, entries, cellMap)).toBe(false);
  });

  it('is false when a cell is empty', () => {
    const entries = { '0,0': 'C', '0,2': 'T' };
    expect(isWordSolved(across, entries, cellMap)).toBe(false);
  });
});

describe('buildPuzzleResults', () => {
  it('scores each placed word against the card that owns it', () => {
    // A real layout keeps the placed words and cells consistent.
    const layout = generateCrossword([
      { answer: 'cat', clue: 'feline' },
      { answer: 'cot', clue: 'small bed' },
    ]);
    const cellMap = new Map(layout.cells.map((c) => [cellKey(c.row, c.col), c]));
    const idByAnswer = new Map([
      ['CAT', 'card-cat'],
      ['COT', 'card-cot'],
    ]);

    // Fill the grid completely from the solution so every word is correct.
    const entries: Record<string, string> = {};
    layout.cells.forEach((c) => {
      entries[cellKey(c.row, c.col)] = c.letter;
    });

    const results = buildPuzzleResults(layout.placed, idByAnswer, entries, cellMap);
    expect(results.length).toBe(layout.placed.length);
    expect(results.every((r) => r.correct)).toBe(true);
    expect(results.map((r) => r.id).sort()).toEqual(['card-cat', 'card-cot']);
  });

  it('marks unfilled words incorrect and drops words with no owning card', () => {
    const layout = generateCrossword([
      { answer: 'cat', clue: 'feline' },
      { answer: 'cot', clue: 'small bed' },
    ]);
    const cellMap = new Map(layout.cells.map((c) => [cellKey(c.row, c.col), c]));
    // Only one of the two words has a known owner.
    const idByAnswer = new Map([['CAT', 'card-cat']]);

    const results = buildPuzzleResults(layout.placed, idByAnswer, {}, cellMap);
    expect(results).toEqual([{ id: 'card-cat', correct: false }]);
  });
});
