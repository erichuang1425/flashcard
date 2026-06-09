/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FillInBlanks } from '../FillInBlanks';
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

const submit = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('Type the word'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
};

describe('<FillInBlanks />', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows the definition prompt (capitalized)', () => {
    render(<FillInBlanks card={card} onAnswer={jest.fn()} />);
    expect(screen.getByText('A small domesticated feline')).toBeInTheDocument();
  });

  it('marks a correct (accent/case-insensitive) answer and advances', () => {
    const onAnswer = jest.fn();
    render(<FillInBlanks card={card} onAnswer={onAnswer} />);

    submit('  CAT ');
    expect(screen.getByRole('alert')).toHaveTextContent('Correct!');
    expect(onAnswer).not.toHaveBeenCalled(); // advance is delayed

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('reveals the answer and reports a wrong attempt', () => {
    const onAnswer = jest.fn();
    render(<FillInBlanks card={card} onAnswer={onAnswer} />);

    submit('dog');
    expect(screen.getByRole('alert')).toHaveTextContent('The correct answer is: cat');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('disables the submit button until something is typed', () => {
    render(<FillInBlanks card={card} onAnswer={jest.fn()} />);
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
  });
});
