import { isValidText, sanitizeText } from '../textSanitizer';

describe('sanitizeText', () => {
  it('preserves multilingual text and paragraph breaks', () => {
    expect(sanitizeText('  Cafe\u0301  閱讀\r\n\r\n第二段  ')).toBe(
      'Café 閱讀\n\n第二段'
    );
  });

  it('removes unsafe control characters without flattening the article', () => {
    expect(sanitizeText('First\u0000 paragraph\nSecond\tparagraph')).toBe(
      'First paragraph\nSecond paragraph'
    );
  });
});

describe('isValidText', () => {
  it('accepts ordinary multilingual article content', () => {
    expect(isValidText('A readable article with café and 中文。')).toBe(true);
  });

  it('rejects blank and control-heavy content', () => {
    expect(isValidText('   \n\t')).toBe(false);
    expect(isValidText('\u0000\u0001\u0002valid')).toBe(false);
  });
});
