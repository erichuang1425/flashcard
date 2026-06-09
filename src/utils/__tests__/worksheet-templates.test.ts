// `worksheet-templates` pulls vocabulary from `../services/firestore`, which
// loads `../services/firebase` (Vite `import.meta.env`) at module init. Mock the
// firestore module so none of that runs and we can feed in deterministic
// definitions.
const mockGetVocabularyDefinitions = jest.fn();

jest.mock('../../services/firestore', () => ({
  getVocabularyDefinitions: (...args: unknown[]) => mockGetVocabularyDefinitions(...args),
  getRandomVocabularyWords: jest.fn(),
}));

import {
  templates,
  generateWorksheet,
  exportWorksheet,
} from '../worksheet-templates';
import type { VocabularyDefinition, Worksheet } from '../../types';

const def = (over: Partial<VocabularyDefinition> & { word: string }): VocabularyDefinition => ({
  englishDefinition: 'a default definition',
  chineseTranslation: '預設',
  partOfSpeech: 'noun',
  examples: ['An example sentence.'],
  ...over,
});

describe('generateWorksheet', () => {
  beforeEach(() => {
    mockGetVocabularyDefinitions.mockReset();
  });

  it('throws on an unknown template id', async () => {
    await expect(generateWorksheet(['cat'], 'nope', 'medium')).rejects.toThrow('Invalid template');
  });

  it('builds MC, translation and usage questions for a non-easy difficulty', async () => {
    const definitions = [
      def({ word: 'cat', englishDefinition: 'a feline', chineseTranslation: '貓' }),
      def({ word: 'dog', englishDefinition: 'a canine', chineseTranslation: '狗' }),
    ];
    mockGetVocabularyDefinitions.mockResolvedValue(definitions);

    const { questions, answers } = await generateWorksheet(['cat'], 'comprehensivePractice', 'medium');

    const types = questions.map((q) => q.type);
    expect(types).toEqual(['multipleChoice', 'translation', 'writing']);

    const mc = questions.find((q) => q.type === 'multipleChoice')!;
    // Correct answer is the capitalized definition and must be among the options.
    expect(mc.correctAnswer).toBe('A feline');
    expect(mc.options).toContain('A feline');
    expect(answers[mc.id!].correctAnswer).toBe('A feline');

    const translation = questions.find((q) => q.type === 'translation')!;
    expect(translation.correctAnswer).toBe('貓');

    // Medium difficulty writing question is worth 7 points; hard is worth 10.
    const writing = questions.find((q) => q.type === 'writing')!;
    expect(writing.points).toBe(7);
  });

  it('awards 10 points for the writing question on hard difficulty', async () => {
    mockGetVocabularyDefinitions.mockResolvedValue([def({ word: 'cat', englishDefinition: 'a feline' })]);
    const { questions } = await generateWorksheet(['cat'], 'comprehensivePractice', 'hard');
    expect(questions.find((q) => q.type === 'writing')!.points).toBe(10);
  });

  it('emits only the translation question on easy difficulty', async () => {
    mockGetVocabularyDefinitions.mockResolvedValue([def({ word: 'cat' })]);
    const { questions } = await generateWorksheet(['cat'], 'comprehensivePractice', 'easy');
    expect(questions.map((q) => q.type)).toEqual(['translation']);
  });

  it('skips words that have no definition', async () => {
    mockGetVocabularyDefinitions.mockResolvedValue([def({ word: 'cat' })]);
    const { questions } = await generateWorksheet(['cat', 'ghost'], 'comprehensivePractice', 'medium');
    // Only "cat" has a definition; "ghost" contributes nothing.
    expect(questions.every((q) => !q.question.includes('ghost'))).toBe(true);
  });
});

describe('templates.comprehensivePractice.generate', () => {
  it('produces a multiple-choice question whose options include the answer', async () => {
    const definitions = [
      def({ word: 'cat', englishDefinition: 'a feline', chineseTranslation: '貓' }),
      def({ word: 'dog', englishDefinition: 'a canine', chineseTranslation: '狗' }),
    ];
    const questions = await templates.comprehensivePractice.generate(['cat'], 'medium', definitions);

    const mc = questions.find((q) => q.type === 'multipleChoice')!;
    expect(mc.correctAnswer).toBe('a feline');
    expect(mc.options).toContain('a feline');
    expect(mc.options!.length).toBeLessThanOrEqual(4);
  });

  it('omits the writing exercise on easy difficulty', async () => {
    const definitions = [def({ word: 'cat', englishDefinition: 'a feline', chineseTranslation: '貓' })];
    const questions = await templates.comprehensivePractice.generate(['cat'], 'easy', definitions);
    expect(questions.some((q) => q.type === 'writing')).toBe(false);
  });
});

describe('templates.translationMastery.generate', () => {
  it('produces one translation question per word', async () => {
    const questions = await templates.translationMastery.generate(
      ['cat', 'dog'],
      'medium',
      [def({ word: 'cat' }), def({ word: 'dog' })]
    );
    expect(questions).toHaveLength(2);
    expect(questions.every((q) => q.type === 'translation')).toBe(true);
  });
});

describe('exportWorksheet', () => {
  const worksheet: Worksheet = {
    title: 'My Worksheet',
    difficulty: 'medium',
    timeLimit: 20,
    questions: [
      { type: 'multipleChoice', question: 'What is a cat?', options: ['a feline', 'a canine'] },
      { type: 'translation', question: 'Translate cat' },
    ],
  } as unknown as Worksheet;

  it('renders a document with the title and one entry per question', async () => {
    const doc = await exportWorksheet(worksheet, 'pdf');
    const texts = JSON.stringify(doc.content);
    expect(texts).toContain('My Worksheet');
    expect(texts).toContain('1. What is a cat?');
    expect(texts).toContain('2. Translate cat');
    // The MC question's options are rendered as a bullet list.
    expect(texts).toContain('a feline');
  });

  it('produces the same document for the docx format', async () => {
    const pdf = await exportWorksheet(worksheet, 'pdf');
    const docx = await exportWorksheet(worksheet, 'docx');
    expect(docx).toEqual(pdf);
  });
});
