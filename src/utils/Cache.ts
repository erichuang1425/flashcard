export class Cache<T> {
  private cache: Map<string, {data: T, timestamp: number}>;
  private ttl: number; // Time to live in milliseconds
  private persistentKeys: Set<string>;

  constructor(ttlMinutes: number = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
    this.persistentKeys = new Set();
    this.loadFromLocalStorage();
  }

  set(key: string, value: T, persistent: boolean = false): void {
    const timestamp = Date.now();
    this.cache.set(key, { data: value, timestamp });
    
    if (persistent) {
      this.persistentKeys.add(key);
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({ data: value, timestamp }));
      } catch (e) {
        console.warn('Failed to persist cache item:', e);
      }
    }
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.persistentKeys.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  clear(): void {
    this.cache.clear();
    this.clearLocalStorage();
    this.persistentKeys.clear();
  }

  // Add method to check if cache is stale
  isStale(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return true;
    return Date.now() - item.timestamp > this.ttl;
  }

  // Add method to refresh timestamp
  touch(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      item.timestamp = Date.now();
      if (this.persistentKeys.has(key)) {
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(item));
        } catch (e) {
          console.warn('Failed to update cache timestamp:', e);
        }
      }
    }
  }

  private loadFromLocalStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '');
          const actualKey = key.replace('cache_', '');
          this.cache.set(actualKey, item);
          this.persistentKeys.add(actualKey);
        } catch (e) {
          console.warn('Failed to load cached item:', e);
        }
      }
    }
  }

  private clearLocalStorage(): void {
    this.persistentKeys.forEach(key => {
      localStorage.removeItem(`cache_${key}`);
    });
  }
}

// Create singleton instances for different types of data
export const flashcardCache = new Cache<any>(15); // 15 minutes TTL
export const categoryCache = new Cache<any>(30); // 30 minutes TTL
export const worksheetCache = new Cache<any>(60); // 1 hour TTL
export const studyStatsCache = new Cache<any>(2); // 2 minutes TTL (more frequent updates)
export const analyticsCache = new Cache<any>(10); // 10 minutes TTL
export const userWorksheetCache = new Cache<any>(20); // 20 minutes TTL
