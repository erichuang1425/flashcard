import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import dictionaryService from '../dictionaryService';

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockData = [{ word: 'test', meanings: [] }];
let fetchCount = 0;

beforeEach(() => {
  fetchCount = 0;
  globalThis.localStorage = new LocalStorageMock() as any;
  globalThis.fetch = (async () => {
    fetchCount++;
    return {
      ok: true,
      json: async () => mockData,
    } as any;
  }) as any;
});

test('fetchDefinition retrieves data and caches it', async () => {
  const first = await dictionaryService.fetchDefinition('test');
  const second = await dictionaryService.fetchDefinition('test');
  assert.deepEqual(first, mockData);
  assert.deepEqual(second, mockData);
  assert.equal(fetchCount, 1);
});
