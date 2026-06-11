import type { Article } from '../types/reading';
import type { Translate } from './translations';

export const articleTitle = (article: Pick<Article, 'title'>, t: Translate) =>
  article.title || t('reading.library.untitled');

export const articleCategory = (
  article: Pick<Article, 'category'>,
  t: Translate
) =>
  article.category === 'uncategorized'
    ? t('reading.library.uncategorized')
    : article.category;
