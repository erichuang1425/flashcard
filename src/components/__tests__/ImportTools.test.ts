import { parseCSVLine } from '../../utils/csv';

describe('parseCSVLine', () => {
  it('parses simple CSV lines', () => {
    const result = parseCSVLine('word,noun,definition,translation');
    expect(result).toEqual(['word', 'noun', 'definition', 'translation']);
  });

  it('handles quoted fields with commas', () => {
    const line = '"hello, world",noun,"def, with, comma",tran';
    const result = parseCSVLine(line);
    expect(result).toEqual(['hello, world', 'noun', 'def, with, comma', 'tran']);
  });

  it('handles escaped quotes', () => {
    const line = '"He said ""hi""",verb,something,other';
    const result = parseCSVLine(line);
    expect(result).toEqual(['He said "hi"', 'verb', 'something', 'other']);
  });

  it('preserves empty trailing fields', () => {
    const line = 'word,noun,definition,';
    const result = parseCSVLine(line);
    expect(result).toEqual(['word', 'noun', 'definition', '']);
  });
});
