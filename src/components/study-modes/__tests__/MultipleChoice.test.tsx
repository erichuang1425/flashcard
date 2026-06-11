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

const renderMC = (onOutcome: jest.Mock) =>
  render(
    <LanguageProvider>
      <MultipleChoice card={card} deck={deck} onOutcome={onOutcome} />
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

  it('prompts with the word and auto-advances on a fast correct choice as Easy', () => {
    const onOutcome = jest.fn();
    renderMC(onOutcome);

    expect(screen.getByText('cat')).toBeInTheDocument();
    fireEvent.click(optionButton('a feline'));

    expect(onOutcome).not.toHaveBeenCalled(); // 1s delay before advancing
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onOutcome).toHaveBeenCalledWith({ cardId: 'c1', quality: 4 });
  });

  it('grades a slow correct choice as Good rather than Easy', () => {
    const onOutcome = jest.fn();
    renderMC(onOutcome);

    // Let more than the fast-answer window pass before answering.
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    fireEvent.click(optionButton('a feline'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onOutcome).toHaveBeenCalledWith({ cardId: 'c1', quality: 3 });
  });

  it('waits for the user to continue after a wrong choice, then reports a lapse', () => {
    const onOutcome = jest.fn();
    renderMC(onOutcome);

    fireEvent.click(optionButton('a canine')); // wrong
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // Must not auto-advance on a wrong answer.
    expect(onOutcome).not.toHaveBeenCalled();

    // A continue button appears; clicking it reports the miss as a lapse.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onOutcome).toHaveBeenCalledWith({ cardId: 'c1', quality: 1 });
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
