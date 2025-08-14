import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const SAT_URL = 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/7%20SAT-%E4%B9%B1%E5%BA%8F.txt';

interface Entry {
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseTranslation: string;
}

const fetchSATList = async (): Promise<string> => {
  const { stdout } = await execAsync(`curl -L -s ${SAT_URL}`);
  return stdout as string;
};

const parseLine = (line: string): Entry | null => {
  line = line.trim();
  if (!line) return null;
  const [word, ...restParts] = line.split(/\s+/);
  if (!word || restParts.length === 0) return null;
  const rest = restParts.join(' ');
  const posMatches = rest.match(/[a-zA-Z]+\./g);
  const partOfSpeech = posMatches ? posMatches.join(' ') : '';
  const chineseTranslation = posMatches ? rest.replace(/[a-zA-Z]+\./g, '').trim() : rest.trim();
  return { word, partOfSpeech, englishDefinition: '', chineseTranslation };
};

const fetchDefinition = async (word: string): Promise<string> => {
  try {
    const { stdout } = await execAsync(`curl -L -s https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const data = JSON.parse(stdout);
    const entry = data && data[0];
    const meaning = entry?.meanings?.[0];
    const def = meaning?.definitions?.[0];
    if (def?.definition) {
      return def.example ? `${def.definition} e.g. ${def.example}` : def.definition;
    }
  } catch (err) {
    // ignore errors
  }
  return '';
};

const main = async () => {
  const raw = await fetchSATList();
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: Entry[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) entries.push(parsed);
  }

  let index = 0;
  const concurrency = 10;
  const workers: Promise<void>[] = [];

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= entries.length) break;
      const def = await fetchDefinition(entries[i].word);
      if (def) entries[i].englishDefinition = def;
    }
  };

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csvLines = [
    'word,partOfSpeech,englishDefinition,chineseTranslation,categories',
    ...entries.map(e => [e.word, e.partOfSpeech, e.englishDefinition, e.chineseTranslation, ''].map(v => escape(v || '')).join(',')),
  ];

  await fs.writeFile(path.join('public', 'sat.csv'), csvLines.join('\n'), 'utf8');
};

main();
