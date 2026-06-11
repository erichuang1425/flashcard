import { Worksheet } from '@/types';
import pdfMake from 'pdfmake/build/pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { worksheetContainsCJK } from '../utils/cjk';

// Noto Sans TC covers both Latin and Traditional Chinese glyphs. It has no
// italic cut, so the italic slots reuse the upright weights. pdfMake fetches a
// registered font only when a document actually references it, so Latin-only
// exports never pay to download this (~5MB) CJK file.
const NOTO_SANS_TC_BASE = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-tc@0.2.3';

let isInitialized = false;

export const initializePdfMake = async () => {
  if (!isInitialized) {
    pdfMake.fonts = {
      Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
      },
      NotoSansTC: {
        normal: `${NOTO_SANS_TC_BASE}/NotoSansTC_400Regular.ttf`,
        bold: `${NOTO_SANS_TC_BASE}/NotoSansTC_700Bold.ttf`,
        italics: `${NOTO_SANS_TC_BASE}/NotoSansTC_400Regular.ttf`,
        bolditalics: `${NOTO_SANS_TC_BASE}/NotoSansTC_700Bold.ttf`
      }
    };

    isInitialized = true;
  }
  return pdfMake;
};

export const generateWorksheetPDF = async (worksheet: Worksheet): Promise<TDocumentDefinitions> => {
  const pdfMakeInstance = await initializePdfMake();
  if (!pdfMakeInstance) {
    throw new Error('PDF generation is not available');
  }

  const content: any[] = [
    {
      text: worksheet.title,
      style: 'header'
    },
    {
      text: `Created: ${worksheet.createdAt.toLocaleDateString()}`,
      style: 'subheader'
    },
    {
      text: `Difficulty: ${worksheet.difficulty}`,
      style: 'subheader'
    }
  ];

  let currentSection = '';
  worksheet.questions.forEach((question, index) => {
    const sectionName = question.type === 'multipleChoice' ? 'Multiple Choice' :
                       question.type === 'translation' ? 'Translation' : 
                       'Writing Practice';

    if (currentSection !== sectionName) {
      currentSection = sectionName;
      content.push({
        text: sectionName,
        style: 'sectionHeader',
        margin: [0, 15, 0, 10]
      });
    }

    content.push({
      text: `${index + 1}. ${question.question}`,
      style: 'question',
      margin: [0, 10, 0, 5]
    });

    if (question.options) {

      content.push({
        stack: question.options.map((option, optIndex) => ({
          text: `${String.fromCharCode(65 + optIndex)}. ${option.replace(/^[ⒶⒷⒸⒹ]\s/, '')}`,
          margin: [20, 2] 
        }))
      });
    }

    content.push({
      text: 'Answer: _________________________________',
      style: 'answerSpace',
      margin: [0, 10, 0, 15]
    });
  });

  if (worksheet.content) {
    content.push({
      text: worksheet.content,
      style: 'content',
      margin: [0, 20]
    });
  }

  if (worksheet.answers) {
    type AnswerKeyEntry = { correctAnswer: string; explanation?: string; examples?: string[] };
    content.push(
      { text: 'Answer Key', style: 'sectionHeader', pageBreak: 'before' },
      ...Object.entries(worksheet.answers).map(([qId, rawAnswer]) => {
        const answer = rawAnswer as AnswerKeyEntry;
        return {
          stack: [
            { text: `Question ${qId}:`, style: 'answerHeader' },
            { text: `Correct Answer: ${answer.correctAnswer}`, style: 'answer' },
            answer.explanation ?
              { text: `Explanation: ${answer.explanation}`, style: 'explanation' } : [],
            answer.examples ?
              { ul: answer.examples.map((ex: string) => ({ text: ex })) } : []
          ],
          margin: [0, 5, 0, 10]
        };
      })
    );
  }

  return {
    content,
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        margin: [0, 5, 0, 5]
      },
      question: {
        fontSize: 12,
        bold: true
      },
      content: {
        fontSize: 12
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: '#4f46e5'
      },
      answerSpace: {
        fontSize: 12,
        italics: true
      },
      answerHeader: {
        fontSize: 12,
        bold: true
      },
      answer: {
        fontSize: 11
      },
      explanation: {
        fontSize: 11,
        italics: true,
        color: '#666666'
      }
    },
    defaultStyle: {
      // Use the CJK-capable font whenever the worksheet contains Chinese (a
      // translated UI label or a vocabulary translation); otherwise Roboto.
      font: worksheetContainsCJK(worksheet) ? 'NotoSansTC' : 'Roboto'
    }
  };
};