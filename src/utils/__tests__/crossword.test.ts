import { generateCrossword } from '../crossword';

describe('generateCrossword', () => {
  it('anchors the first word horizontally at the origin', () => {
    const layout = generateCrossword([{ answer: 'cat', clue: 'a feline' }]);

    expect(layout.placed).toHaveLength(1);
    expect(layout.placed[0]).toMatchObject({
      answer: 'cat',
      row: 0,
      col: 0,
      direction: 'across',
      number: 1,
    });
    expect(layout.cells).toHaveLength(3);
    expect(layout.rows).toBe(1);
    expect(layout.cols).toBe(3);
  });

  it('crosses a second word on a shared letter', () => {
    const layout = generateCrossword([
      { answer: 'cat', clue: 'a feline' },
      { answer: 'tar', clue: 'sticky stuff' },
    ]);

    expect(layout.placed).toHaveLength(2);
    expect(layout.unplaced).toHaveLength(0);

    const across = layout.placed.find((p) => p.direction === 'across');
    const down = layout.placed.find((p) => p.direction === 'down');
    expect(across).toBeDefined();
    expect(down).toBeDefined();

    // The shared 'T' cell is occupied by exactly one letter.
    const sharedCells = layout.cells.filter((c) => c.letter === 'T');
    expect(sharedCells).toHaveLength(1);

    // A crossed grid has fewer cells than the sum of word lengths.
    expect(layout.cells.length).toBeLessThan('cat'.length + 'tar'.length);
  });

  it('reports words that cannot be crossed as unplaced', () => {
    const layout = generateCrossword([
      { answer: 'cat', clue: 'a feline' },
      { answer: 'dog', clue: 'a canine' },
    ]);

    expect(layout.placed).toHaveLength(1);
    expect(layout.placed[0].answer).toBe('cat');
    expect(layout.unplaced.map((e) => e.answer)).toEqual(['dog']);
  });

  it('skips short and duplicate answers', () => {
    const layout = generateCrossword([
      { answer: 'a', clue: 'too short' },
      { answer: 'cat', clue: 'a feline' },
      { answer: 'CAT', clue: 'duplicate' },
      { answer: '!?', clue: 'no letters' },
    ]);

    expect(layout.placed).toHaveLength(1);
    expect(layout.placed[0].answer).toBe('cat');
  });

  it('ignores non-letter characters when matching crossings', () => {
    const layout = generateCrossword([
      { answer: 'co-op', clue: 'shared business' },
      { answer: 'open', clue: 'not closed' },
    ]);

    // 'co-op' sanitizes to COOP and shares 'O' / 'P' with OPEN.
    expect(layout.placed).toHaveLength(2);
    expect(layout.unplaced).toHaveLength(0);
  });

  it('produces a deterministic layout for the same input', () => {
    const entries = [
      { answer: 'study', clue: 'learn' },
      { answer: 'daily', clue: 'every day' },
      { answer: 'yield', clue: 'produce' },
    ];

    const first = generateCrossword(entries);
    const second = generateCrossword(entries);
    expect(first).toEqual(second);
  });
});
