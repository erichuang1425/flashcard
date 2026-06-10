/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MultipleChoice } from '../MultipleChoice';
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

const card = makeCard('c1', 'cat', 'a feline');
const deck = [card, makeCard('c2', 'dog', 'a canine')];

const renderMC = (onAnswer: jest.Mock) =>
  render(
    <LanguageProvider>
      <MultipleChoice card={card} deck={deck} onAnswer={onAnswer} />
    </LanguageProvider>
  );

// Option buttons render the (capitalized) definition; match on it, ignoring the
// direction-toggle buttons.
const optionButton = (def: string) =>
  screen.getByRole('button', { name: new RegExp(def, 'i') });

describe('<MultipleChoice />', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('prompts with the word and auto-advances on a correct choice', () => {
    const onAnswer = jest.fn();
    renderMC(onAnswer);

    expect(screen.getByText('cat')).toBeInTheDocument();
    fireEvent.click(optionButton('a feline'));

    expect(onAnswer).not.toHaveBeenCalled(); // 1s delay before advancing
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('waits for the user to continue after a wrong choice', () => {
    const onAnswer = jest.fn();
    renderMC(onAnswer);

    fireEvent.click(optionButton('a canine')); // wrong
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // Must not auto-advance on a wrong answer.
    expect(onAnswer).not.toHaveBeenCalled();

    // A continue button appears; clicking it reports the miss.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('translates the direction controls and feedback for Traditional Chinese', () => {
    window.localStorage.setItem('flashcard.language', 'zh');
    renderMC(jest.fn());

    expect(screen.getByRole('button', { name: '單字 → 意思' })).toBeInTheDocument();
    expect(screen.getByLabelText('題目方向')).toBeInTheDocument();

    fireEvent.click(optionButton('a canine'));
    expect(screen.getByRole('status')).toHaveTextContent('答錯了。正確答案是 A feline');
  });
});
