import {
  capitalizeFirstWord,
  capitalizeAfterPunctuation,
  shuffle,
  normalizeAnswer,
} from '../helpers';

describe('capitalizeFirstWord', () => {
  it('capitalizes only the first character', () => {
    expect(capitalizeFirstWord('hello world')).toBe('Hello world');
  });

  it('leaves an already-capitalized word unchanged', () => {
    expect(capitalizeFirstWord('Hello')).toBe('Hello');
  });

  it('returns falsy/empty input untouched', () => {
    expect(capitalizeFirstWord('')).toBe('');
  });

  it('handles a single character', () => {
    expect(capitalizeFirstWord('a')).toBe('A');
  });
});

describe('capitalizeAfterPunctuation', () => {
  it('capitalizes after punctuation with no space', () => {
    expect(capitalizeAfterPunctuation('hello.world')).toBe('Hello.World');
  });

  it('capitalizes after punctuation with spaces', () => {
    expect(capitalizeAfterPunctuation('hello. world!test? ok')).toBe('Hello. World!Test? Ok');
  });

  it('returns empty input untouched', () => {
    expect(capitalizeAfterPunctuation('')).toBe('');
  });

  it('leaves text with no lowercase sentence starts unchanged', () => {
    expect(capitalizeAfterPunctuation('ALL CAPS. OK')).toBe('ALL CAPS. OK');
  });
});

describe('shuffle', () => {
  it('returns a new array without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('preserves all elements', () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input).sort((a, b) => a - b)).toEqual(input);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });

  it('produces a roughly uniform distribution of first positions', () => {
    // A biased sort-based shuffle skews toward the identity permutation; a
    // Fisher-Yates shuffle should land each element in position 0 roughly
    // equally often. This guards against regressing to the biased approach.
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    const runs = 6000;
    for (let i = 0; i < runs; i++) {
      counts[shuffle([0, 1, 2])[0]]++;
    }
    const expected = runs / 3;
    Object.values(counts).forEach(count => {
      expect(Math.abs(count - expected)).toBeLessThan(expected * 0.25);
    });
  });
});

describe('normalizeAnswer', () => {
  it('lower-cases and trims', () => {
    expect(normalizeAnswer('  Hello  ')).toBe('hello');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeAnswer('a   b\tc')).toBe('a b c');
  });

  it('strips accents so accented and plain spellings match', () => {
    expect(normalizeAnswer('Café')).toBe('cafe');
    expect(normalizeAnswer('café')).toBe(normalizeAnswer('cafe'));
  });
});
