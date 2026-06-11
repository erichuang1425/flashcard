import { translations, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../translations';

describe('translations', () => {
  it('defines a dictionary for every supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(translations[lang]).toBeDefined();
      expect(LANGUAGE_NAMES[lang]).toBeTruthy();
    }
  });

  it('keeps every language in key parity with English', () => {
    const englishKeys = Object.keys(translations.en).sort();
    for (const lang of SUPPORTED_LANGUAGES) {
      const keys = Object.keys(translations[lang]).sort();
      expect(keys).toEqual(englishKeys);
    }
  });

  it('has no empty translation values', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const [key, value] of Object.entries(translations[lang])) {
        if (value.trim().length === 0) {
          throw new Error(`Empty translation for ${lang}:${key}`);
        }
      }
    }
  });

  it('preserves placeholder tokens across languages', () => {
    const tokens = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    for (const key of Object.keys(translations.en)) {
      const expected = tokens(translations.en[key]);
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(tokens(translations[lang][key])).toEqual(expected);
      }
    }
  });

  it('covers every major first-party UI surface in Traditional Chinese', () => {
    const requiredKeys = [
      'common.loading',
      'study.mode.flashcards',
      'study.crossword.title',
      'import.title',
      'worksheets.title',
      'diary.newEntry',
      'profile.achievements',
      'pomodoro.focusTime',
      'gamification.levelUp',
      'import.pack.toeflReadingCore',
      'import.pack.toeflReadingCoreLabel',
      'import.pack.toeflConnectors',
      'import.pack.toeflConnectorsLabel',
      'import.pack.toeflBuildSentence',
      'import.pack.toeflBuildSentenceLabel',
      'import.pack.toeflEmail',
      'import.pack.toeflEmailLabel',
      'import.pack.toeflDiscussion',
      'import.pack.toeflDiscussionLabel',
      'import.pack.toeflWordFamilies',
      'import.pack.toeflWordFamiliesLabel',
      'import.pack.toeflListeningSpeaking',
      'import.pack.toeflListeningSpeakingLabel',
      'reading.library.untitled',
      'reading.library.uncategorized',
      'reading.import.error.missingDetails',
      'settings.accent.american',
      'settings.accent.newZealand',
      'worksheets.prompt.meaning',
      'worksheets.prompt.translateToChinese',
      'worksheets.prompt.writeSentence',
      'worksheets.export.created',
      'worksheets.export.correctAnswer',
    ];

    for (const key of requiredKeys) {
      expect(translations.en[key]).toBeTruthy();
      expect(translations.zh[key]).toBeTruthy();
      expect(translations.zh[key]).not.toBe(translations.en[key]);
    }
  });
});
