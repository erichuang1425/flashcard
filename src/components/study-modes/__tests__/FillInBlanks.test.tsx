/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FillInBlanks } from '../FillInBlanks';
import { LanguageProvider } from '../../../i18n/LanguageContext';
import type { Flashcard } from '../../../types';

const card: Flashcard = {
  id: 'c1',
  userId: 'u1',
  word: 'cat',
  partOfSpeech: 'noun',
  englishDefinition: 'a small domesticated feline',
  chineseTranslation: '貓',
  difficulty: 1,
  categories: [],
  created: new Date(0),
  nextReview: new Date(0),
  mastered: false,
};

const renderFillInBlanks = (onOutcome: jest.Mock) =>
  render(
    <LanguageProvider>
      <FillInBlanks card={card} onOutcome={onOutcome} />
    </LanguageProvider>
  );

const submit = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('Type the word'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
};

describe('<FillInBlanks />', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows the definition prompt (capitalized)', () => {
    renderFillInBlanks(jest.fn());
    expect(screen.getByText('A small domesticated feline')).toBeInTheDocument();
  });

  it('marks a fast correct (accent/case-insensitive) answer as Easy and advances', () => {
    const onOutcome = jest.fn();
    renderFillInBlanks(onOutcome);

    submit('  CAT ');
    expect(screen.getByRole('alert')).toHaveTextContent('Correct!');
    expect(onOutcome).not.toHaveBeenCalled(); // advance is delayed

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onOutcome).toHaveBeenCalledWith({ cardId: 'c1', quality: 4 });
  });

  it('grades a slow correct answer as Good rather than Easy', () => {
    const onOutcome = jest.fn();
    renderFillInBlanks(onOutcome);

    // Let more than the fast-answer window pass before answering.
    act(() => {
      jest.advanceTimersByTime(11000);
    });
    submit('cat');
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onOutcome).toHaveBeenCalledWith({ cardId: 'c1', quality: 3 });
  });

  it('reveals the answer and reports a wrong attempt as a lapse', () => {
    const onOutcome = jest.fn();
    renderFillInBlanks(onOutcome);

    submit('dog');
    expect(screen.getByRole('alert')).toHaveTextContent('The correct answer is: cat');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onOutcome).toHaveBeenCalledWith({ cardId: 'c1', quality: 1 });
  });

  it('disables the submit button until something is typed', () => {
    renderFillInBlanks(jest.fn());
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
  });

  it('translates the form and answer feedback for Traditional Chinese', () => {
    window.localStorage.setItem('flashcard.language', 'zh');
    renderFillInBlanks(jest.fn());

    expect(screen.getByText('詞性：noun')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('輸入單字'), { target: { value: 'dog' } });
    fireEvent.click(screen.getByRole('button', { name: '檢查答案' }));
    expect(screen.getByRole('alert')).toHaveTextContent('正確答案是：cat');
  });
});
