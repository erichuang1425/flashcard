import type { Worksheet, WorksheetQuestion, QuestionType, VocabularyDefinition } from '../types';
import { getVocabularyDefinitions } from '../services/firestore';
import type { Translate } from '../i18n/translations';

const capitalizeFirstWord = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

interface Template {
  titleKey: string;
  generate: (
    words: string[],
    difficulty: string,
    definitions: VocabularyDefinition[],
    t: Translate
  ) => Promise<WorksheetQuestion[]>;
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
    titleKey: 'worksheets.generator.template.comprehensivePractice',
    generate: async (
      words: string[],
      difficulty: string,
      definitions: VocabularyDefinition[],
      t: Translate
    ) => {
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
          question: t('worksheets.prompt.meaning', { word }),
          // The correct answer should be the English definition, not the prompt
          // for the writing exercise
          correctAnswer: def.englishDefinition,
          options,
          points: 5
        });

        if (def.chineseTranslation) {
          questions.push({
            type: 'translation',
            question: t('worksheets.prompt.translateToChinese', { word }),
            correctAnswer: def.chineseTranslation,
            points: 5
          });
        }

        if (difficulty !== 'easy') {
          questions.push({
            type: 'writing',
            question: t('worksheets.prompt.writeSentence', { word }),
            correctAnswer: '',
            explanation:
              def.examples?.[0] ||
              t('worksheets.prompt.exampleSentence', { word }),
            points: difficulty === 'hard' ? 10 : 7
          });
        }
      }

      return questions;
    }
  },
  translationMastery: {
    titleKey: 'worksheets.generator.template.translationMastery',
    generate: async (
      words: string[],
      _difficulty: string,
      _definitions: VocabularyDefinition[],
      t: Translate
    ) => {
      return words.map(word => ({
        type: 'translation',
        question: t('worksheets.prompt.translateAndUse', { word }),
        correctAnswer: '', 
        explanation: t('worksheets.prompt.considerContext'),
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

export const generateWorksheet = async (
  words: string[], 
  templateId: string, 
  difficulty: string,
  t: Translate
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

      // The correct answer must match the option value the student actually
      // selects (the displayed, capitalized option text) — not a letter index.
      const correctOption = capitalizeFirstWord(def.englishDefinition);

      questions.push({
        id: questionId,
        type: 'multipleChoice',
        question: t('worksheets.prompt.meaning', { word }),
        options: options.map((opt) => capitalizeFirstWord(opt)),
        points: 5,
        correctAnswer: correctOption
      });

      answers[questionId] = {
        correctAnswer: correctOption,
        explanation: t('worksheets.prompt.meaningExplanation', {
          word,
          definition: def.englishDefinition,
        })
      };
    }

    const transQuestionId = `q${wordIndex}_trans`;
    questions.push({
      id: transQuestionId,
      type: 'translation',
      question: t('worksheets.prompt.translateToChinese', { word }),
      points: 5,
      correctAnswer: def.chineseTranslation || ''
    });

    answers[transQuestionId] = {
      correctAnswer: def.chineseTranslation || '',
      explanation: `${word} = ${def.chineseTranslation}`
    };

    if (difficulty !== 'easy') {
      const usageQuestionId = `q${wordIndex}_usage`;
      const sampleAnswer =
        def.examples?.[0] ||
        t('worksheets.prompt.exampleWordDefinition', {
          word,
          definition: def.englishDefinition,
        });
      
      questions.push({
        id: usageQuestionId,
        type: 'writing',
        question: t('worksheets.prompt.writeSentence', { word }),
        points: difficulty === 'hard' ? 10 : 7,
        correctAnswer: sampleAnswer
      });

      answers[usageQuestionId] = {
        correctAnswer: sampleAnswer,
        examples: def.examples || [
          t('worksheets.prompt.exampleDefinition', {
            definition: def.englishDefinition,
          }),
        ],
        explanation: t('worksheets.prompt.usageExplanation', {
          word,
          definition: def.englishDefinition,
        })
      };
    }
  });

  return { questions, answers };
};

export const exportWorksheet = async (
  worksheet: Worksheet,
  format: 'pdf' | 'docx',
  t: Translate
) => {
  const doc = {
    content: [
      { text: worksheet.title, style: 'header' },
      {
        text: t('worksheets.export.difficulty', {
          difficulty: t(`worksheets.generator.${worksheet.difficulty}`),
        }),
        style: 'subheader'
      },
      {
        text: t('worksheets.export.timeLimit', {
          minutes: worksheet.timeLimit,
        }),
        style: 'subheader'
      },
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
