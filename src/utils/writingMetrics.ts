export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export const countSentences = (text: string): number => {
  const sentences = text.match(/[^.!?]+[.!?]*/g);
  return sentences ? sentences.length : 0;
};

export const countSyllables = (word: string): number => {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  const vowels = word.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 0;
  if (word.endsWith('e')) count -= 1;
  return count > 0 ? count : 1;
};

export const countTotalSyllables = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.reduce((sum, w) => sum + countSyllables(w), 0);
};

export const fleschKincaidGrade = (text: string): number => {
  const words = countWords(text);
  const sentences = countSentences(text) || 1;
  const syllables = countTotalSyllables(text);
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
};
