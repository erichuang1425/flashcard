import { containsCJK, worksheetContainsCJK } from '../cjk';
import type { Worksheet } from '../../types';

const baseWorksheet = (overrides: Partial<Worksheet> = {}): Worksheet => ({
  id: 'w1',
  userId: 'u1',
  templateId: 't1',
  title: 'Vocabulary Quiz',
  words: ['serendipity'],
  timeLimit: 600,
  difficulty: 'easy',
  categories: ['general'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  questions: [
    {
      type: 'multipleChoice',
      question: 'What does "serendipity" mean?',
      correctAnswer: 'a pleasant surprise',
      options: ['a pleasant surprise', 'a heavy burden'],
      points: 1,
    },
  ],
  stats: { completed: 0, total: 1 },
  ...overrides,
});

describe('containsCJK', () => {
  it('detects Traditional Chinese characters', () => {
    expect(containsCJK('意外的驚喜')).toBe(true);
  });

  it('detects fullwidth CJK punctuation', () => {
    expect(containsCJK('答案：')).toBe(true);
  });

  it('returns false for Latin-only text', () => {
    expect(containsCJK('a pleasant surprise')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(containsCJK(undefined)).toBe(false);
    expect(containsCJK(42)).toBe(false);
  });
});

describe('worksheetContainsCJK', () => {
  it('is false for a fully English worksheet', () => {
    expect(worksheetContainsCJK(baseWorksheet())).toBe(false);
  });

  it('is true when a question carries a Chinese translation', () => {
    const worksheet = baseWorksheet({
      questions: [
        {
          type: 'translation',
          question: 'Translate: serendipity',
          correctAnswer: '意外發現美好事物的能力',
          points: 1,
        },
      ],
    });
    expect(worksheetContainsCJK(worksheet)).toBe(true);
  });

  it('is true when only a translated UI label (title) is Chinese', () => {
    expect(worksheetContainsCJK(baseWorksheet({ title: '詞彙測驗' }))).toBe(true);
  });

  it('is true when Chinese appears only in the answer key', () => {
    const worksheet = baseWorksheet({
      answers: {
        q1: { correctAnswer: 'a pleasant surprise', explanation: '意外的驚喜' },
      },
    });
    expect(worksheetContainsCJK(worksheet)).toBe(true);
  });
});
