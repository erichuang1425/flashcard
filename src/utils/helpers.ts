
export const capitalizeFirstWord = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const capitalizeAfterPunctuation = (text: string): string => {
  if (!text) return text;
  return text.replace(/(^|[.!?]\s*)([a-z])/g, (_match, p1, p2) => p1 + p2.toUpperCase());
};

/**
 * Returns a new array with the elements randomly reordered using the
 * Fisher-Yates algorithm, which produces a uniform distribution. This is the
 * shared shuffle used by study modes so answer/option ordering is unbiased
 * (unlike `array.sort(() => Math.random() - 0.5)`, which is statistically
 * skewed).
 */
export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Normalizes a free-text answer for forgiving comparison: lower-cased,
 * trimmed, internal whitespace collapsed, and accent marks removed so that
 * e.g. "café" and "cafe" are treated as equal.
 */
export const normalizeAnswer = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');