import type { Worksheet } from '../types';

// Matches CJK ideographs plus the common CJK symbol, kana, and fullwidth
// punctuation ranges. Used to decide whether rendered output (e.g. a PDF)
// needs a CJK-capable font instead of a Latin-only one.
const CJK_PATTERN =
  /[⺀-⻿　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/;

export const containsCJK = (value: unknown): boolean =>
  typeof value === 'string' && CJK_PATTERN.test(value);

// A worksheet carries CJK text in many places: a translated title, prompts,
// options, the free-form `content`, and the answer key. Serializing the whole
// worksheet is the simplest way to catch CJK wherever it appears, including
// Traditional Chinese vocabulary translations in otherwise-English exports.
export const worksheetContainsCJK = (worksheet: Worksheet): boolean => {
  try {
    return CJK_PATTERN.test(JSON.stringify(worksheet));
  } catch {
    return containsCJK(worksheet.title) || containsCJK(worksheet.content);
  }
};
