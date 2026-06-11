import fs from 'fs';
import path from 'path';
import { parseCSVLine } from '../../utils/csv';

const PACKS = [
  ['toefl-reading-academic-core.csv', 32],
  ['toefl-connectors.csv', 24],
  ['toefl-writing-build-a-sentence.csv', 24],
  ['toefl-writing-email.csv', 18],
  ['toefl-writing-academic-discussion.csv', 22],
  ['toefl-reading-word-families.csv', 24],
  ['toefl-listening-speaking.csv', 16],
] as const;

const HEADER = 'word,partOfSpeech,englishDefinition,chineseTranslation';
const publicDirectory = path.resolve(__dirname, '../../../public');

describe('TOEFL iBT bundled packs', () => {
  it('provides seven complete, readable, non-overlapping CSV packs', () => {
    const headwords: string[] = [];

    for (const [filename, expectedRows] of PACKS) {
      const filePath = path.join(publicDirectory, filename);
      expect(fs.existsSync(filePath)).toBe(true);

      const lines = fs.readFileSync(filePath, 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter(line => line.trim().length > 0);

      expect(lines[0]).toBe(HEADER);
      expect(lines.slice(1)).toHaveLength(expectedRows);

      for (const line of lines.slice(1)) {
        const fields = parseCSVLine(line);
        expect(fields).toHaveLength(4);
        expect(fields.every(field => field.trim().length > 0)).toBe(true);

        const [word, , , chineseTranslation] = fields;
        expect(chineseTranslation).toMatch(/[\u3400-\u9fff]/u);
        expect(chineseTranslation).not.toMatch(/\uFFFD|Ã|Â|â€™|ï¿½/u);
        headwords.push(word.trim().toLocaleLowerCase('en'));
      }
    }

    expect(headwords).toHaveLength(160);
    expect(new Set(headwords).size).toBe(160);

    const normalizedHeadwords = headwords.map(headword =>
      headword
        .replace(/\[[^\]]+\]/g, '')
        .replace(/[^a-z]+/g, ' ')
        .trim()
    );
    expect(new Set(normalizedHeadwords).size).toBe(160);
  });

  it('registers every TOEFL pack in the approved two-day order', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../ImportTools.tsx'),
      'utf8'
    );

    let previousIndex = -1;
    for (const [filename] of PACKS) {
      const fileReference = `file: '/${filename}'`;
      const currentIndex = source.indexOf(fileReference);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }

    expect(source.match(/category: 'TOEFL iBT'/g)).toHaveLength(7);
  });
});
