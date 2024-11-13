
export const capitalizeFirstWord = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const capitalizeAfterPunctuation = (text: string): string => {
  if (!text) return text;
  return text.replace(/(^|\.\s+|\!\s+|\?\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
};