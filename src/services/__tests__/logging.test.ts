import { ArticleError, CacheError, logger } from '../logging';

describe('logging', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records errors with their context', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('network unavailable');

    logger.error('Article load failed', error, { articleId: 'article-1' });

    expect(errorSpy).toHaveBeenCalledWith(
      '[ERROR] Article load failed',
      error,
      { articleId: 'article-1' }
    );
  });

  it('provides typed article and cache errors', () => {
    const articleError = new ArticleError('Import failed', { title: 'Example' });
    const cacheError = new CacheError('Cache failed', { key: 'articles' });

    expect(articleError.name).toBe('ArticleError');
    expect(articleError.context).toEqual({ title: 'Example' });
    expect(cacheError.name).toBe('CacheError');
    expect(cacheError.context).toEqual({ key: 'articles' });
  });
});
