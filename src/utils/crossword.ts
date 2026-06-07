/**
 * Self-contained crossword layout generator.
 *
 * Given a list of answer/clue pairs it greedily places words on an infinite
 * grid, crossing them on shared letters the way a real crossword does, then
 * normalizes the result into a compact, numbered grid. It is intentionally
 * dependency-free and deterministic so the layout can be unit-tested and the
 * same set of words always produces the same puzzle.
 */

export interface CrosswordEntry {
  /** The word the player must fill in. */
  answer: string;
  /** The clue shown to the player (e.g. the English definition). */
  clue: string;
}

export type Direction = 'across' | 'down';

export interface PlacedEntry {
  answer: string;
  clue: string;
  /** Row of the first letter, normalized so the grid starts at 0. */
  row: number;
  /** Column of the first letter, normalized so the grid starts at 0. */
  col: number;
  direction: Direction;
  /** Clue number shared by the cell where the word begins. */
  number: number;
}

export interface CrosswordCell {
  row: number;
  col: number;
  /** The (uppercase) solution letter for this cell. */
  letter: string;
  /** Set when a word begins at this cell. */
  number?: number;
}

export interface CrosswordLayout {
  cells: CrosswordCell[];
  placed: PlacedEntry[];
  /** Entries that could not be crossed into the grid. */
  unplaced: CrosswordEntry[];
  rows: number;
  cols: number;
}

interface WorkingPlacement {
  entry: CrosswordEntry;
  letters: string;
  row: number;
  col: number;
  direction: Direction;
}

const sanitize = (value: string): string => value.toUpperCase().replace(/[^A-Z]/g, '');

const keyOf = (row: number, col: number): string => `${row},${col}`;

/**
 * Build a crossword layout from the supplied entries. Words shorter than two
 * letters (after stripping non-letters) and duplicate answers are skipped. The
 * first word anchors the grid horizontally; every subsequent word is crossed on
 * a shared letter or reported as `unplaced`.
 */
export const generateCrossword = (entries: CrosswordEntry[]): CrosswordLayout => {
  const prepared: { entry: CrosswordEntry; letters: string }[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const letters = sanitize(entry.answer);
    if (letters.length < 2 || seen.has(letters)) continue;
    seen.add(letters);
    prepared.push({ entry, letters });
  }

  // Longest words first crosses more reliably; alphabetical tie-break keeps it
  // deterministic.
  prepared.sort(
    (a, b) => b.letters.length - a.letters.length || a.letters.localeCompare(b.letters)
  );

  const grid = new Map<string, string>();
  const placements: WorkingPlacement[] = [];
  const unplaced: CrosswordEntry[] = [];

  const cellAt = (row: number, col: number): string | undefined => grid.get(keyOf(row, col));

  /** Returns the intersection count for a candidate placement, or null if invalid. */
  const scorePlacement = (
    letters: string,
    row: number,
    col: number,
    direction: Direction
  ): number | null => {
    const dr = direction === 'across' ? 0 : 1;
    const dc = direction === 'across' ? 1 : 0;

    // The cells immediately before and after the word must be empty so we don't
    // accidentally extend an existing word.
    if (cellAt(row - dr, col - dc)) return null;
    if (cellAt(row + dr * letters.length, col + dc * letters.length)) return null;

    let intersections = 0;
    for (let i = 0; i < letters.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = cellAt(r, c);

      if (existing) {
        if (existing !== letters[i]) return null;
        intersections++;
      } else {
        // A brand-new letter must not sit alongside a parallel word.
        if (cellAt(r + dc, c + dr) || cellAt(r - dc, c - dr)) return null;
      }
    }

    return intersections;
  };

  const commit = (placement: WorkingPlacement): void => {
    const { letters, row, col, direction } = placement;
    for (let i = 0; i < letters.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      grid.set(keyOf(r, c), letters[i]);
    }
    placements.push(placement);
  };

  prepared.forEach(({ entry, letters }, index) => {
    if (index === 0) {
      commit({ entry, letters, row: 0, col: 0, direction: 'across' });
      return;
    }

    let best: { row: number; col: number; direction: Direction; score: number } | null = null;

    for (let li = 0; li < letters.length; li++) {
      for (const placed of placements) {
        for (let pj = 0; pj < placed.letters.length; pj++) {
          if (placed.letters[pj] !== letters[li]) continue;

          const crossRow = placed.direction === 'across' ? placed.row : placed.row + pj;
          const crossCol = placed.direction === 'across' ? placed.col + pj : placed.col;
          const direction: Direction = placed.direction === 'across' ? 'down' : 'across';
          const row = direction === 'across' ? crossRow : crossRow - li;
          const col = direction === 'across' ? crossCol - li : crossCol;

          const score = scorePlacement(letters, row, col, direction);
          if (score !== null && score >= 1 && (!best || score > best.score)) {
            best = { row, col, direction, score };
          }
        }
      }
    }

    if (best) {
      commit({ entry, letters, row: best.row, col: best.col, direction: best.direction });
    } else {
      unplaced.push(entry);
    }
  });

  if (grid.size === 0) {
    return { cells: [], placed: [], unplaced, rows: 0, cols: 0 };
  }

  let minRow = Infinity;
  let minCol = Infinity;
  let maxRow = -Infinity;
  let maxCol = -Infinity;
  grid.forEach((_letter, key) => {
    const [r, c] = key.split(',').map(Number);
    minRow = Math.min(minRow, r);
    minCol = Math.min(minCol, c);
    maxRow = Math.max(maxRow, r);
    maxCol = Math.max(maxCol, c);
  });

  const placed: PlacedEntry[] = placements.map((placement) => ({
    answer: placement.entry.answer,
    clue: placement.entry.clue,
    row: placement.row - minRow,
    col: placement.col - minCol,
    direction: placement.direction,
    number: 0,
  }));

  // Assign clue numbers in reading order; across/down words that begin on the
  // same cell share a number.
  const numberByStart = new Map<string, number>();
  let nextNumber = 0;
  [...placed]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .forEach((entry) => {
      const key = keyOf(entry.row, entry.col);
      if (!numberByStart.has(key)) {
        nextNumber += 1;
        numberByStart.set(key, nextNumber);
      }
      entry.number = numberByStart.get(key)!;
    });

  const cells: CrosswordCell[] = [];
  grid.forEach((letter, key) => {
    const [r, c] = key.split(',').map(Number);
    const row = r - minRow;
    const col = c - minCol;
    const cell: CrosswordCell = { row, col, letter };
    const number = numberByStart.get(keyOf(row, col));
    if (number) cell.number = number;
    cells.push(cell);
  });

  return {
    cells,
    placed,
    unplaced,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
};
