import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  translations,
} from './translations';

const STORAGE_KEY = 'flashcard.language';

interface LanguageContextType {
  language: Language;
  /** Change the active UI language and remember it on this device. */
  setLanguage: (language: Language) => void;
  /** Translate a key, interpolating any `{token}` placeholders. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as string[]).includes(value);

/**
 * Pick a sensible default before any account preference is known:
 * a value previously chosen on this device, otherwise the browser's
 * preferred language (Traditional Chinese speakers land on `zh`).
 */
const detectInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) return stored;

  const browser = window.navigator.language?.toLowerCase() ?? '';
  if (browser.startsWith('zh')) return 'zh';

  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  // Reflect the active language on the document so the browser applies the
  // correct fonts/line-breaking, and assistive tech announces it correctly.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private-mode or storage-disabled browsers: keep the in-memory choice.
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[language];
      let template = dict[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          // split/join instead of a RegExp replace: var names need no regex
          // escaping and values containing `$&`/`$$` are inserted literally.
          template = template.split(`{${name}}`).join(String(value));
        }
      }
      return template;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

/** Convenience hook when a component only needs the translate function. */
export const useTranslation = () => useLanguage().t;
