const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/gu;

const countCharacters = (value: string): number => Array.from(value).length;

export const sanitizeText = (text: string): string => {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(UNSAFE_CONTROL_CHARACTERS, '');

  return normalized
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const isValidText = (text: string): boolean => {
  const visibleText = sanitizeText(text);
  if (!visibleText) return false;

  const totalCharacters = countCharacters(text);
  if (totalCharacters === 0) return false;

  const unsafeCharacters = countCharacters(text.match(UNSAFE_CONTROL_CHARACTERS)?.join('') ?? '');
  return unsafeCharacters / totalCharacters < 0.05;
};
