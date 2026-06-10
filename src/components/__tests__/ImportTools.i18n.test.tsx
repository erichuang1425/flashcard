/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ImportTools } from '../ImportTools';
import { LanguageProvider } from '../../i18n/LanguageContext';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

jest.mock('../../services/firestore', () => ({
  addCategory: jest.fn(),
  addFlashcard: jest.fn(),
  getCategories: jest.fn().mockResolvedValue([]),
}));

it('renders the import modes and primary action in Traditional Chinese', async () => {
  window.localStorage.setItem('flashcard.language', 'zh');

  render(
    <LanguageProvider>
      <ImportTools />
    </LanguageProvider>
  );

  expect(await screen.findByText('檔案匯入')).toBeInTheDocument();
  expect(screen.getByText('手動輸入')).toBeInTheDocument();
  expect(screen.getByText('上傳 CSV 檔案')).toBeInTheDocument();
});
