import React, { createContext, useContext, useState, useCallback } from 'react';
import { en } from '../i18n/translations/en';
import { zhTW } from '../i18n/translations/zh-TW';

// Define available languages
export type Language = 'en' | 'zh-TW';

// Define the translations type based on the English translations structure
type TranslationsType = typeof en;

// Define nested path type for translations
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)];

// Define the values that can be passed to the translation function
interface TranslationValues {
  [key: string]: string | number;
}

// Define the context type
interface I18nContextType {
  t: (key: NestedKeyOf<TranslationsType>, values?: { values: TranslationValues }) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const translations: Record<Language, TranslationsType> = {
  en,
  'zh-TW': zhTW
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((path: NestedKeyOf<TranslationsType>, options?: { values: TranslationValues }): string => {
    const keys = path.split('.');
    let current: any = translations[language];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation key not found: ${path}`);
        return path;
      }
      current = current[key];
    }

    if (typeof current !== 'string') {
      console.warn(`Translation key is not a string: ${path}`);
      return path;
    }

    if (options?.values) {
      return current.replace(/\{\{(\w+)\}\}/g, (_, key) => 
        String(options.values[key] ?? `{{${key}}}`)
      );
    }

    return current;
  }, [language]);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};