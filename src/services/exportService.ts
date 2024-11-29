import { Worksheet } from '../types';
import { Document, Paragraph, Packer } from 'docx';
import { generateWorksheetPDF } from './pdfService';
import JSZip from 'jszip';
import { collection, getDocs } from '@firebase/firestore';
import { db } from './firebase';

export const exportWorksheet = async (worksheet: Worksheet, format: 'pdf' | 'docx') => {
  if (format === 'pdf') {
    return generateWorksheetPDF(worksheet);
  } else {
    return generateDOCX(worksheet);
  }
};

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

interface ExportOptions {
  flashcards: boolean;
  articles: boolean;
}

export const exportUserData = async (userId: string, options: ExportOptions) => {
  const zip = new JSZip();
  
  if (options.flashcards) {
    // Export flashcards as CSV
    const flashcardsRef = collection(db, 'users', userId, 'flashcards');
    const snapshot = await getDocs(flashcardsRef);
    const flashcardsData = snapshot.docs.map(doc => {
      const data = doc.data();
      return [
        data.word,
        data.partOfSpeech,
        data.englishDefinition,
        data.chineseTranslation,
        (data.categories || []).join(';')
      ].join(',');
    });
    
    const csvContent = ['word,partOfSpeech,englishDefinition,chineseTranslation,categories']
      .concat(flashcardsData)
      .join('\n');
      
    zip.file('flashcards.csv', csvContent);
  }

  if (options.articles) {
    // Export articles with their original structure
    const articlesRef = collection(db, 'users', userId, 'articles');
    const snapshot = await getDocs(articlesRef);
    
    const articlesFolder = zip.folder('articles');
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const article = {
        title: data.title,
        content: data.content,
        category: data.category,
        sourceUrl: data.sourceUrl
      };
      
      // Create individual zip for each article to match import format
      const articleZip = new JSZip();
      articleZip.file('article.json', JSON.stringify(article, null, 2));
      if (data.coverImage) {
        articleZip.file('cover.jpg', data.coverImage, {base64: true});
      }
      
      const articleZipBlob = await articleZip.generateAsync({type: 'blob'});
      articlesFolder?.file(`${doc.id}.zip`, articleZipBlob);
    }
  }

  return zip.generateAsync({type: 'blob'});
};