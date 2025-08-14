const CACHE_PREFIX = 'dictionary:';

export async function fetchDefinition(word: string): Promise<any> {
  const key = `${CACHE_PREFIX}${word.toLowerCase()}`;

  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse errors and refetch
      }
    }
  }

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch definition for ${word}`);
  }
  const data = await response.json();

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  }

  return data;
}

export default {
  fetchDefinition,
};
