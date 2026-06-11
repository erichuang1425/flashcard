jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

import {
  countArticleWords,
  filterAndSortArticles,
  normalizeArticleCounter,
  normalizeArticleDocument,
  toArticleDocument,
} from '../articleService';
import { Article } from '../../types/reading';

const article = (overrides: Partial<Article>): Article => ({
  id: 'article-1',
  title: 'Example',
  content: 'Example content',
  category: 'general',
  wordCount: 2,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  readCount: 0,
  readingTime: 1,
  progress: {
    wordsRead: 0,
    lastPosition: 0,
    completed: false,
    progress: 0,
    timeSpent: 0,
  },
  ...overrides,
});

describe('normalizeArticleDocument', () => {
  it('normalizes legacy Firestore shapes into the canonical article model', () => {
    const createdAt = new Date('2025-05-01T12:00:00Z');

    const result = normalizeArticleDocument('legacy-id', {
      title: ' Legacy article ',
      content: 'one two three',
      createdAt: { toDate: () => createdAt },
      wordCount: '3',
      progress: {
        lastPosition: 12,
        completed: true,
      },
    });

    expect(result).toMatchObject({
      id: 'legacy-id',
      title: 'Legacy article',
      category: 'uncategorized',
      wordCount: 3,
      readingTime: 1,
      createdAt,
      progress: {
        wordsRead: 0,
        lastPosition: 12,
        completed: true,
        progress: 0,
        timeSpent: 0,
      },
    });
  });

  it('leaves a missing title empty so the UI can localize its fallback', () => {
    expect(normalizeArticleDocument('missing-title', {}).title).toBe('');
  });
});

describe('countArticleWords', () => {
  it('counts whitespace-delimited and CJK words', () => {
    expect(countArticleWords('one two three')).toBe(3);
    expect(countArticleWords('\u4f60\u597d\u4e16\u754c')).toBe(4);
  });
});

describe('normalizeArticleCounter', () => {
  it('preserves a legacy count when the item index is incomplete', () => {
    expect(normalizeArticleCounter({ count: 5, items: [] })).toMatchObject({
      count: 5,
      items: [],
    });
  });
});

describe('filterAndSortArticles', () => {
  it('filters by search and category before sorting by progress', () => {
    const articles = [
      article({ id: '1', title: 'Alpha story', category: 'news', progress: { ...article({}).progress, progress: 20 } }),
      article({ id: '2', title: 'Beta story', category: 'news', progress: { ...article({}).progress, progress: 80 } }),
      article({ id: '3', title: 'Beta notes', category: 'essay', progress: { ...article({}).progress, progress: 90 } }),
    ];

    expect(
      filterAndSortArticles(articles, {
        category: 'news',
        searchTerm: 'story',
        sortBy: 'progress',
      }).map(({ id }) => id)
    ).toEqual(['2', '1']);
  });
});

describe('toArticleDocument', () => {
  it('omits undefined optional fields before writing to Firestore', () => {
    const document = toArticleDocument(
      article({
        subtitle: undefined,
        coverImage: undefined,
        sourceUrl: undefined,
      })
    );

    expect(document).not.toHaveProperty('subtitle');
    expect(document).not.toHaveProperty('coverImage');
    expect(document).not.toHaveProperty('sourceUrl');
  });
});
