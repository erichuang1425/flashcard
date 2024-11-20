
export const sanitizeText = (text: string): string => {
  return text
    // Allow basic Latin, Latin-1 Supplement, and Latin Extended-A characters (includes accents)
    // Also allow basic punctuation and whitespace
    .replace(/[^\u0020-\u007F\u00A0-\u024F\p{P}\s]/gu, '')
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    .trim();
};

export const isValidText = (text: string): boolean => {
  // Test if text contains mostly allowed characters
  const illegalCharCount = text.match(/[^\u0020-\u007F\u00A0-\u024F\p{P}\s]/gu)?.length || 0;
  const totalLength = text.length;
  
  // Allow up to 5% illegal characters
  return illegalCharCount / totalLength < 0.05;
};