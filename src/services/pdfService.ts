import { Worksheet } from '@/types';
import pdfMake from 'pdfmake/build/pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

let isInitialized = false;

export const initializePdfMake = async () => {
  if (!isInitialized) {
    pdfMake.fonts = {
      Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
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
    content.push(
      { text: 'Answer Key', style: 'sectionHeader', pageBreak: 'before' },
      ...Object.entries(worksheet.answers).map(([qId, ans]) => ({
        stack: [
          { text: `Question ${qId}:`, style: 'answerHeader' },
          { text: `Correct Answer: ${(ans as { correctAnswer: string }).correctAnswer}`, style: 'answer' },
          (ans as { explanation?: string }).explanation ? 
            { text: `Explanation: ${(ans as { explanation: string }).explanation}`, style: 'explanation' } : [],
          (ans as { examples?: string[] }).examples ? 
            { ul: (ans as { examples: string[] }).examples.map((ex: string) => ({ text: ex })) } : []
        ],
        margin: [0, 5, 0, 10]
      }))
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
        color: '#2196f3'
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
      font: 'Roboto'
    }
  };
};