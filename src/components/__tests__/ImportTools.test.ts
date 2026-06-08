import { parseCSVLine, normalizeCSVText } from '../../utils/csv';

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

describe('normalizeCSVText', () => {
  it('strips a leading UTF-8 BOM', () => {
    expect(normalizeCSVText('\uFEFFword,noun,def,tran')).toBe('word,noun,def,tran');
  });

  it('converts CRLF line endings to LF', () => {
    expect(normalizeCSVText('a,b\r\nc,d')).toBe('a,b\nc,d');
  });

  it('converts lone CR line endings to LF', () => {
    expect(normalizeCSVText('a,b\rc,d')).toBe('a,b\nc,d');
  });

  it('leaves clean text untouched', () => {
    expect(normalizeCSVText('a,b\nc,d')).toBe('a,b\nc,d');
  });

  it('removes trailing carriage returns so the last column is clean', () => {
    const lastCell = parseCSVLine(normalizeCSVText('word,noun,def,tran\r').split('\n')[0])[3];
    expect(lastCell).toBe('tran');
  });
});
