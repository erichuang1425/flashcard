import type { Worksheet, WorksheetQuestion, QuestionType, VocabularyDefinition, FlashcardMetadata } from '../types';
import { getVocabularyDefinitions, batchGetFlashcards } from '../services/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

const capitalizeFirstWord = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

interface Template {
  title: string;
  description: string;
  generate: (words: string[], difficulty: string, definitions: VocabularyDefinition[], metadata?: FlashcardMetadata[]) 
    => Promise<WorksheetGenerationResult>;
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
      const answers: WorksheetGenerationResult['answers'] = {};
      
      for (const word of words) {
        const def = definitions.find(d => d.word === word);
        if (!def) continue;

        const otherDefs = definitions.filter(d => d.word !== word);
        const options = shuffleArray([
          def.englishDefinition,
          ...otherDefs.map(d => d.englishDefinition)
        ]).slice(0, 4);

        const mcQuestion: WorksheetQuestion = {
          type: 'multipleChoice',
          question: `What is the meaning of "${word}"?`,
          correctAnswer: def.englishDefinition,
          options,
          points: 5
        };
        questions.push(mcQuestion);
        answers[`mc_${word}`] = {
          correctAnswer: def.englishDefinition,
          explanation: `The correct meaning of "${word}" is: ${def.englishDefinition}`
        };

        if (def.chineseTranslation) {
          const transQuestion: WorksheetQuestion = {
            type: 'translation',
            question: `Translate "${word}" to Chinese:`,
            correctAnswer: def.chineseTranslation,
            points: 5
          };
          questions.push(transQuestion);
          answers[`trans_${word}`] = {
            correctAnswer: def.chineseTranslation,
            explanation: `The Chinese translation of "${word}" is: ${def.chineseTranslation}`
          };
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

      return { questions, answers };
    }
  },
  translationMastery: {
    title: 'Translation Mastery',
    description: 'Practice translating between languages with context',
    generate: async (words: string[], difficulty: string, definitions: VocabularyDefinition[]) => {
      const questions: WorksheetQuestion[] = [];
      const answers: WorksheetGenerationResult['answers'] = {};

      words.forEach((word, index) => {
        const def = definitions.find(d => d.word === word);
        if (!def) return;

        const question: WorksheetQuestion = {
          type: 'translation',
          question: `Translate and use "${word}" in a sentence:`,
          correctAnswer: def.chineseTranslation || '', 
          explanation: 'Consider the context and usage',
          points: 5
        };
        questions.push(question);
        answers[`trans_${index}`] = {
          correctAnswer: def.chineseTranslation || '',
          explanation: 'Consider the context and usage',
          examples: def.examples
        };
      });

      return { questions, answers };
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
  difficulty: string,
  metadata?: FlashcardMetadata[]
): Promise<WorksheetGenerationResult> => {
  // Input validation
  if (!words?.length) {
    throw new Error('No words provided');
  }

  const template = templates[templateId];
  if (!template) {
    throw new Error('Invalid template');
  }

  try {
    // Get full flashcard data if metadata is provided
    const allDefinitions = metadata && metadata[0] 
      ? await batchGetFlashcards(
          metadata[0].userId || '', // Ensure userId is available
          metadata.map(m => m.id)
        ).then(cards => cards.map(card => ({
          word: card.word,
          englishDefinition: card.englishDefinition,
          chineseTranslation: card.chineseTranslation,
          partOfSpeech: card.partOfSpeech,
          examples: card.exampleSentence ? [card.exampleSentence] : []
        })))
      : await getVocabularyDefinitions(words);

    if (!allDefinitions?.length) {
      throw new Error('No definitions found for provided words');
    }

    // Generate questions using template
    const { questions, answers } = await template.generate(words, difficulty, allDefinitions);

    return { questions, answers };
  } catch (error) {
    console.error('Error generating worksheet:', error);
    throw new Error('Failed to generate worksheet');
  }
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
