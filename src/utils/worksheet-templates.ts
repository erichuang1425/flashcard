import type { Worksheet, WorksheetQuestion, QuestionType, VocabularyDefinition } from '../types';
import { getVocabularyDefinitions, getRandomVocabularyWords } from '../services/firestore';

const capitalizeFirstWord = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

interface Template {
  title: string;
  description: string;
  generate: (words: string[], difficulty: string, definitions: VocabularyDefinition[]) => Promise<WorksheetQuestion[]>;
}

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const templates: Record<string, Template> = {
  comprehensivePractice: {
    title: 'Comprehensive Practice',
    description: 'Practice vocabulary with multiple exercise types',
    generate: async (words: string[], difficulty: string, definitions: VocabularyDefinition[]) => {
      const questions: WorksheetQuestion[] = [];
      
      for (const word of words) {
        const def = definitions.find(d => d.word === word);
        if (!def) continue;

        const otherDefs = definitions.filter(d => d.word !== word);
        const options = shuffleArray([
          def.englishDefinition,
          ...otherDefs.map(d => d.englishDefinition)
        ]).slice(0, 4);

        questions.push({
          type: 'multipleChoice',
          question: `What is the meaning of "${word}"?`,
          correctAnswer: `Write a sentence using "${word}" correctly:`,
          options,
          points: 5
        });

        if (def.chineseTranslation) {
          questions.push({
            type: 'translation',
            question: `Translate "${word}" to Chinese:`,
            correctAnswer: def.chineseTranslation,
            points: 5
          });
        }

        if (difficulty !== 'easy') {
          questions.push({
            type: 'writing',
            question: `Write a sentence using "${word}" correctly:`,
            correctAnswer: '',
            explanation: def.examples?.[0] || `Example: Create a sentence using "${word}"`,
            points: difficulty === 'hard' ? 10 : 7
          });
        }
      }

      return questions;
    }
  },
  translationMastery: {
    title: 'Translation Mastery',
    description: 'Practice translating between languages with context',
    generate: async (words: string[], difficulty: string, definitions: VocabularyDefinition[]) => {
      return words.map(word => ({
        type: 'translation',
        question: `Translate and use "${word}" in a sentence:`,
        correctAnswer: '', 
        explanation: 'Consider the context and usage',
        points: 5
      }));
    }
  }
};

interface WorksheetGenerationResult {
  questions: WorksheetQuestion[];
  answers: {
    [questionId: string]: {
      correctAnswer: string;
      explanation?: string;
      examples?: string[];
    };
  };
}

const LETTERS = ['A', 'B', 'C', 'D']; 

export const generateWorksheet = async (
  words: string[], 
  templateId: string, 
  difficulty: string
): Promise<WorksheetGenerationResult> => {
  const template = templates[templateId];
  if (!template) {
    throw new Error('Invalid template');
  }

  const allDefinitions = await getVocabularyDefinitions(words);
  const answers: { [key: string]: any } = {};
  const questions: WorksheetQuestion[] = [];

  words.forEach((word, wordIndex) => {
    const def = allDefinitions.find(d => d.word === word);
    if (!def) return;

    if (difficulty !== 'easy') {
      const questionId = `q${wordIndex}_mc`;
      const otherDefs = allDefinitions.filter(d => d.word !== word);
      const options = shuffleArray([
        def.englishDefinition,
        ...otherDefs.slice(0, 3).map(d => d.englishDefinition)
      ]);

      const correctAnswerIndex = options.indexOf(def.englishDefinition);
      const letterAnswer = LETTERS[correctAnswerIndex];

      questions.push({
        id: questionId,
        type: 'multipleChoice',
        question: capitalizeFirstWord(`What is the meaning of "${word}"?`),
        options: options.map((opt) => capitalizeFirstWord(opt)),
        points: 5,
        correctAnswer: letterAnswer
      });

      answers[questionId] = {
        correctAnswer: capitalizeFirstWord(`${letterAnswer} ${def.englishDefinition}`),
        explanation: capitalizeFirstWord(`"${word}" means ${def.englishDefinition}`)
      };
    }

    const transQuestionId = `q${wordIndex}_trans`;
    questions.push({
      id: transQuestionId,
      type: 'translation',
      question: `Translate "${word}" to Chinese:`,
      points: 5,
      correctAnswer: def.chineseTranslation || ''
    });

    answers[transQuestionId] = {
      correctAnswer: def.chineseTranslation || '',
      explanation: `${word} = ${def.chineseTranslation}`
    };

    if (difficulty !== 'easy') {
      const usageQuestionId = `q${wordIndex}_usage`;
      const sampleAnswer = def.examples?.[0] || `Example: ${word} - ${def.englishDefinition}`;
      
      questions.push({
        id: usageQuestionId,
        type: 'writing',
        question: `Write a sentence using "${word}" correctly:`,
        points: difficulty === 'hard' ? 10 : 7,
        correctAnswer: sampleAnswer
      });

      answers[usageQuestionId] = {
        correctAnswer: sampleAnswer,
        examples: def.examples || [`Example: ${def.englishDefinition}`],
        explanation: `Use "${word}" in context with its meaning: ${def.englishDefinition}`
      };
    }
  });

  return { questions, answers };
};

export const exportWorksheet = async (worksheet: Worksheet, format: 'pdf' | 'docx') => {
  const doc = {
    content: [
      { text: worksheet.title, style: 'header' },
      { text: `Difficulty: ${worksheet.difficulty}`, style: 'subheader' },
      { text: `Time Limit: ${worksheet.timeLimit} minutes`, style: 'subheader' },
      { text: '\n' },
      ...worksheet.questions.map((q, i) => ([
        { text: `${i + 1}. ${q.question}`, style: 'question' },
        q.options ? {
          ul: q.options.map(opt => ({ text: opt }))
        } : {},
        { text: '\n' }
      ])).flat()
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, margin: [0, 5, 0, 5] },
      question: { fontSize: 12, margin: [0, 5, 0, 5] }
    }
  };

  if (format === 'pdf') {
    return doc;
  }

  return doc;
};
