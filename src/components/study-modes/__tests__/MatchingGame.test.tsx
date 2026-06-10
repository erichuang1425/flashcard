/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchingGame } from '../MatchingGame';
import { LanguageProvider } from '../../../i18n/LanguageContext';
import type { Flashcard } from '../../../types';

const makeCard = (id: string, word: string, def: string): Flashcard => ({
  id,
  userId: 'u1',
  word,
  partOfSpeech: 'noun',
  englishDefinition: def,
  difficulty: 1,
  categories: [],
  created: new Date(0),
  nextReview: new Date(0),
  mastered: false,
});

const cards = [makeCard('c1', 'cat', 'a feline'), makeCard('c2', 'dog', 'a canine')];
const renderGame = (onComplete: jest.Mock) =>
  render(
    <LanguageProvider>
      <MatchingGame cards={cards} onComplete={onComplete} />
    </LanguageProvider>
  );

// aria-labels uniquely identify each tile regardless of the shuffled order.
const clickWord = (text: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Word: ${text}`) }));
const clickDef = (text: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Definition: ${text}`) }));

describe('<MatchingGame />', () => {
  beforeEach(() => window.localStorage.clear());

  it('completes once every word is paired with its definition', () => {
    const onComplete = jest.fn();
    renderGame(onComplete);

    clickWord('cat');
    clickDef('a feline');
    expect(onComplete).not.toHaveBeenCalled(); // one pair left

    clickWord('dog');
    clickDef('a canine');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith([
      { id: 'c1', correct: true },
      { id: 'c2', correct: true },
    ]);
  });

  it('disables a tile once it is matched', () => {
    renderGame(jest.fn());
    clickWord('cat');
    clickDef('a feline');
    expect(screen.getByRole('button', { name: /^Word: cat, matched/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Definition: a feline, matched/ })).toBeDisabled();
  });

  it('does not match a word with the wrong definition', () => {
    const onComplete = jest.fn();
    renderGame(onComplete);
    clickWord('cat');
    clickDef('a canine'); // wrong pairing clears the selection
    expect(screen.getByRole('button', { name: /^Word: cat$/ })).not.toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('translates headings and accessible tile labels for Traditional Chinese', () => {
    window.localStorage.setItem('flashcard.language', 'zh');
    renderGame(jest.fn());

    expect(screen.getByText('將單字與定義配對')).toBeInTheDocument();
    expect(screen.getByText('單字')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '單字：cat' })).toBeInTheDocument();
  });
});
