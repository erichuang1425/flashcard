import type { Worksheet } from '../../types';
import { translations, type Language } from '../../i18n/translations';
import { buildWorksheetPDFDefinition } from '../pdfService';
import { buildWorksheetDocumentLines } from '../exportService';

const translator = (language: Language) => (
  key: string,
  vars?: Record<string, string | number>
) => {
  let value = translations[language][key] ?? translations.en[key] ?? key;
  for (const [name, replacement] of Object.entries(vars ?? {})) {
    value = value.split(`{${name}}`).join(String(replacement));
  }
  return value;
};

const worksheet: Worksheet = {
  id: 'worksheet-1',
  userId: 'user-1',
  templateId: 'comprehensivePractice',
  title: '測驗',
  words: ['cat'],
  timeLimit: 20,
  difficulty: 'medium',
  categories: [],
  createdAt: new Date('2026-06-12T00:00:00Z'),
  questions: [
    {
      id: 'q1',
      type: 'translation',
      question: '將「cat」翻譯成中文：',
      correctAnswer: '貓',
      points: 5,
    },
  ],
  answers: {
    q1: {
      correctAnswer: '貓',
      explanation: 'cat = 貓',
    },
  },
  stats: { completed: 0, total: 1 },
};

describe('worksheet exports', () => {
  const zh = translator('zh');

  it('builds PDF labels with the active language', () => {
    const definition = buildWorksheetPDFDefinition(worksheet, zh, 'zh-TW');
    const content = JSON.stringify(definition.content);

    expect(content).toContain('建立日期：');
    expect(content).toContain('難度：中等');
    expect(content).toContain('翻譯');
    expect(content).toContain('答案：');
    expect(content).toContain('解答');
    expect(content).toContain('正確答案：貓');
    expect(content).not.toContain('Correct Answer:');
  });

  it('builds Word document labels with the active language', () => {
    expect(buildWorksheetDocumentLines(worksheet, zh)).toEqual(
      expect.arrayContaining([
        '難度：中等',
        '時間限制：20 分鐘',
      ])
    );
  });
});
