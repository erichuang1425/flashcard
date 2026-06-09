/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { Article } from '../../types/reading';
import { Reading } from '../Reading';

const setCurrentArticle = jest.fn();
const getArticlePage = jest.fn();
const getFullArticle = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

jest.mock('../../context/ReadingModeContext', () => ({
  useReadingMode: () => ({
    currentArticle: null,
    setCurrentArticle,
  }),
}));

jest.mock('../../services/articleService', () => ({
  getArticlePage: (...args: unknown[]) => getArticlePage(...args),
  getFullArticle: (...args: unknown[]) => getFullArticle(...args),
}));

jest.mock('../../components/reading-mode/ArticleImporter', () => ({
  ArticleImporter: () => <div>Importer</div>,
}));
jest.mock('../../components/reading-mode/ManageArticlesTab', () => ({
  ManageArticlesTab: () => <div>Manage</div>,
}));
jest.mock('../../components/reading-mode/ReadingInterface', () => ({
  ReadingInterface: () => <div>Reader</div>,
}));

const article: Article = {
  id: 'article-1',
  title: 'A test article',
  content: 'one two three',
  category: 'general',
  wordCount: 3,
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
};

describe('Reading page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getArticlePage.mockResolvedValue({
      articles: [article],
      totalCount: 1,
      hasMore: false,
    });
    getFullArticle.mockResolvedValue(article);
  });

  it('loads the article library and opens the selected article', async () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <Reading />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('A test article')).toBeInTheDocument();
    fireEvent.click(screen.getByText('A test article'));

    await waitFor(() =>
      expect(setCurrentArticle).toHaveBeenCalledWith(article)
    );
  });
});
