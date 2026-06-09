/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

const mockGetCategories = jest.fn();
const mockGetVocabularyWords = jest.fn();
const mockUser = { uid: 'user-1' };

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
jest.mock('../../services/firestore', () => ({
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  getVocabularyWords: (...args: unknown[]) => mockGetVocabularyWords(...args),
}));
jest.mock('../../components/WordGrid', () => ({
  WordGrid: () => <div>word grid</div>,
}));
jest.mock('../../components/CategoryBrowser', () => ({
  CategoryBrowser: () => <div>category browser</div>,
}));

import { Library } from '../Library';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCategories.mockResolvedValue([]);
  mockGetVocabularyWords.mockResolvedValue([]);
});

it('loads only categories owned by the signed-in user', async () => {
  render(<Library />);

  await waitFor(() => {
    expect(mockGetCategories).toHaveBeenCalledWith('user-1');
  });
});
