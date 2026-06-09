import { readFileSync } from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

const USER = 'reading-user';
let mockDb: Firestore;

jest.mock('../firebase', () => ({
  get db() {
    return mockDb;
  },
  storage: {},
}));

import { importArticle, updateArticleProgress } from '../articleService';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-flashcard-reading-service',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  mockDb = testEnv.authenticatedContext(USER).firestore() as unknown as Firestore;
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('articleService Firestore integration', () => {
  it('imports an article and updates its counter atomically', async () => {
    const article = await importArticle(USER, {
      title: 'Example article',
      content: 'First paragraph.\n\nSecond paragraph.',
      category: 'reading',
    });

    const articleSnapshot = await getDoc(
      doc(mockDb, 'users', USER, 'articles', article.id)
    );
    const counterSnapshot = await getDoc(
      doc(mockDb, 'users', USER, 'counters', 'articles')
    );

    expect(articleSnapshot.exists()).toBe(true);
    expect(articleSnapshot.data()?.title).toBe('Example article');
    expect(counterSnapshot.data()?.count).toBe(1);
    expect(counterSnapshot.data()?.items).toHaveLength(1);
  });

  it('counts article completion only once', async () => {
    const article = await importArticle(USER, {
      title: 'Example article',
      content: 'one two three',
    });

    await updateArticleProgress(USER, article.id, {
      completed: true,
      progress: 100,
      wordsRead: 3,
    });
    await updateArticleProgress(USER, article.id, {
      completed: true,
      progress: 100,
      wordsRead: 3,
    });

    const statsSnapshot = await getDoc(
      doc(mockDb, 'users', USER, 'stats', 'reading')
    );
    expect(statsSnapshot.data()?.completedArticles).toBe(1);
    expect(statsSnapshot.data()?.totalWordsRead).toBe(3);
  });
});
