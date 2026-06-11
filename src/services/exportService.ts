import { Worksheet } from '../types';
import { Document, Paragraph, Packer } from 'docx';
import type { Translate } from '../i18n/translations';

export const buildWorksheetDocumentLines = (
  worksheet: Worksheet,
  t: Translate
): string[] => [
  t('worksheets.export.difficulty', {
    difficulty: t(`worksheets.generator.${worksheet.difficulty}`),
  }),
  t('worksheets.export.timeLimit', { minutes: worksheet.timeLimit }),
];

export const generateDOCX = async (
  worksheet: Worksheet,
  t: Translate
): Promise<Document> => {
  const [difficulty, timeLimit] = buildWorksheetDocumentLines(worksheet, t);
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: worksheet.title,
          heading: "Heading1"
        }),
        new Paragraph({
          text: difficulty
        }),
        new Paragraph({
          text: timeLimit
        }),
        ...worksheet.questions.map((question, index) => [
          new Paragraph({
            text: `${index + 1}. ${question.question}`
          }),
          ...(question.options ? 
            question.options.map((opt, optIndex) => 
              new Paragraph({
                text: `${String.fromCharCode(65 + optIndex)}. ${opt.replace(/^[ⒶⒷⒸⒹ]\s/, '')}`,
                indent: { left: 720 }, // 720 twips = 0.5 inch
                spacing: { before: 200, after: 200 } 
              })
            ) : [])
        ]).flat()
      ]
    }]
  });

  return doc;
};

export const downloadDOCX = async (doc: Document, filename: string) => {
  try {
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('DOCX export failed:', error);
    throw error;
  }
};
