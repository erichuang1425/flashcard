/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReadingModeProvider, useReadingMode } from '../ReadingModeContext';
import { Article } from '../../types/reading';

const updateArticleProgress = jest.fn();
const getDoc = jest.fn();
const setDoc = jest.fn();
const mockUser = { uid: 'user-1' };

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../services/articleService', () => ({
  updateArticleProgress: (...args: unknown[]) => updateArticleProgress(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'preferences/reading' })),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
}));

jest.mock('../../services/firebase', () => ({ db: {} }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReadingModeProvider>{children}</ReadingModeProvider>
);

const article: Article = {
  id: 'article-1',
  title: 'Article',
  content: 'one two three',
  category: 'general',
  wordCount: 3,
  createdAt: new Date(),
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

describe('ReadingModeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockResolvedValue(undefined);
    updateArticleProgress.mockResolvedValue({
      ...article.progress,
      progress: 50,
      wordsRead: 2,
    });
  });

  it('updates progress for the current article and mirrors it locally', async () => {
    const { result } = renderHook(() => useReadingMode(), { wrapper });

    act(() => result.current.setCurrentArticle(article));
    await act(async () => {
      await result.current.updateProgress({ progress: 50, wordsRead: 2 });
    });

    expect(updateArticleProgress).toHaveBeenCalledWith(
      'user-1',
      'article-1',
      { progress: 50, wordsRead: 2 }
    );
    expect(result.current.currentArticle?.progress.progress).toBe(50);
  });

  it('persists reading settings and updates the context state', async () => {
    const { result } = renderHook(() => useReadingMode(), { wrapper });
    await waitFor(() => expect(result.current.settingsLoading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ fontSize: 22 });
    });

    expect(result.current.readingSettings.fontSize).toBe(22);
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'preferences/reading' },
      expect.objectContaining({ fontSize: 22 }),
      { merge: true }
    );
  });

  it('keeps reading lifecycle callbacks stable across state updates', async () => {
    const { result } = renderHook(() => useReadingMode(), { wrapper });
    await waitFor(() => expect(result.current.settingsLoading).toBe(false));
    const startReading = result.current.startReading;
    const stopReading = result.current.stopReading;

    act(() => result.current.startReading());

    expect(result.current.startReading).toBe(startReading);
    expect(result.current.stopReading).toBe(stopReading);
  });
});
