/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

jest.mock('../../context/PronunciationContext', () => ({
  usePronunciation: () => ({
    autoSpeak: false,
    speak: jest.fn(),
    supported: false,
  }),
}));
jest.mock('../../i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

import { FlashCard } from '../FlashCard';

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: ResizeObserverStub,
  });
});

it('does not run the parent flip shortcut for a nested rating button', () => {
  const onToggleAnswer = jest.fn();
  const onRating = jest.fn();

  render(
    <ThemeProvider theme={createTheme()}>
      <FlashCard
        card={{
          id: 'card-1',
          userId: 'user-1',
          word: 'example',
          partOfSpeech: 'noun',
          englishDefinition: 'a representative form',
          chineseTranslation: '例子',
          difficulty: 0,
          categories: [],
          created: new Date(),
          nextReview: new Date(),
          mastered: false,
        }}
        showAnswer
        onToggleAnswer={onToggleAnswer}
        onRating={onRating}
      />
    </ThemeProvider>
  );

  fireEvent.keyDown(screen.getByRole('button', { name: 'Again' }), { key: 'Enter' });

  expect(onToggleAnswer).not.toHaveBeenCalled();
});
