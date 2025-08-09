import { render, screen, fireEvent } from '@testing-library/react';
import { JSDOM } from 'jsdom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test' },
    loading: false,
    error: null,
    authInitialized: true,
    userPreferences: null,
    signOut: jest.fn(),
    signInWithGoogle: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
  }),
}));

jest.mock('../../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('../../services/firestore', () => ({
  addCategory: jest.fn(),
  addFlashcard: jest.fn(),
  getFlashcardMetadata: jest.fn(() => Promise.resolve({ items: [] })),
  getUserFlashcards: jest.fn(() => Promise.resolve({ cards: [] })),
}));

jest.mock('../../services/storage', () => ({
  uploadFile: jest.fn(),
}));

jest.mock('../../services/translationService', () => ({
  translateToTraditionalChinese: jest.fn(),
}));

jest.mock('../../services/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

import { ImportTools } from '../ImportTools';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;

describe('ImportTools SAT loader', () => {
  it('loads SAT vocabulary and shows preview', async () => {
    const mockCSV = 'word,partOfSpeech,englishDefinition,chineseTranslation\nabate,v,to lessen,減弱';
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockCSV),
      })
    ) as any;

    render(<ImportTools defaultMode="file" onModeChange={() => {}} />);

    fireEvent.click(screen.getByText('Load SAT Vocabulary'));

    expect(global.fetch).toHaveBeenCalledWith('/sat.csv');

    expect(await screen.findByText('abate')).toBeTruthy();
    expect(await screen.findByText('SAT')).toBeTruthy();
  });
});
