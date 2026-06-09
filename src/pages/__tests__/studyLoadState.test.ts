import type { Flashcard } from '../../types';
import { classifyLoadedStudyCards } from '../studyLoadState';

const card = (nextReview: Date): Flashcard => ({
  id: 'card-1',
  userId: 'user-1',
  word: 'example',
  partOfSpeech: 'noun',
  englishDefinition: 'a representative form',
  chineseTranslation: '例子',
  difficulty: 0,
  categories: [],
  created: new Date('2026-01-01T00:00:00Z'),
  nextReview,
  mastered: false,
});

it('treats zero due cards as an empty success state instead of an error', () => {
  const result = classifyLoadedStudyCards(
    [card(new Date('2026-06-10T00:00:00Z'))],
    new Date('2026-06-09T00:00:00Z')
  );

  expect(result).toEqual({ dueCards: [], error: null });
});

it('normalizes serialized review dates before deciding whether a card is due', () => {
  const serialized = {
    ...card(new Date('2026-06-08T00:00:00Z')),
    nextReview: '2026-06-08T00:00:00Z' as unknown as Date,
  };

  const result = classifyLoadedStudyCards(
    [serialized],
    new Date('2026-06-09T00:00:00Z')
  );

  expect(result.dueCards).toEqual([serialized]);
});
