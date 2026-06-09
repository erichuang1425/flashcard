import { Worksheet } from '../types';
import { Document, Paragraph, Packer } from 'docx';
export const generateDOCX = async (worksheet: Worksheet): Promise<Document> => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: worksheet.title,
          heading: "Heading1"
        }),
        new Paragraph({
          text: `Difficulty: ${worksheet.difficulty}`
        }),
        new Paragraph({
          text: `Time Limit: ${worksheet.timeLimit} minutes`
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