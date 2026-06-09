import {
  clearCachedArticle,
  readCachedArticle,
  writeCachedArticle,
} from '../articleCache';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('articleCache', () => {
  const storage = new MemoryStorage();

  beforeEach(() => storage.clear());

  it('keeps cached articles scoped to the signed-in user', () => {
    writeCachedArticle('alice', 'article-1', 'Alice content', 1_000, storage);

    expect(readCachedArticle('alice', 'article-1', 1_100, storage)).toBe('Alice content');
    expect(readCachedArticle('bob', 'article-1', 1_100, storage)).toBeNull();
  });

  it('expires stale content and removes it from storage', () => {
    writeCachedArticle('alice', 'article-1', 'Old content', 1_000, storage);

    expect(readCachedArticle('alice', 'article-1', 31 * 60 * 1_000, storage)).toBeNull();
    expect(storage.length).toBe(0);
  });

  it('clears one cached article without affecting another', () => {
    writeCachedArticle('alice', 'article-1', 'One', 1_000, storage);
    writeCachedArticle('alice', 'article-2', 'Two', 1_000, storage);

    clearCachedArticle('alice', 'article-1', storage);

    expect(readCachedArticle('alice', 'article-1', 1_100, storage)).toBeNull();
    expect(readCachedArticle('alice', 'article-2', 1_100, storage)).toBe('Two');
  });
});
