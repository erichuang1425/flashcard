import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en } from '../i18n/translations/en';
import { zhTW } from '../i18n/translations/zh-TW';
import { useUserPreferences } from '../context/UserPreferencesContext';
import type { UserPreferences } from '../context/UserPreferencesContext';

export type Language = 'en' | 'zh-TW';


type TranslationsType = typeof en;


type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)];


interface TranslationValues {
  [key: string]: string | number;
}


interface I18nContextType {
  t: (key: NestedKeyOf<TranslationsType>, options?: { values: TranslationValues }) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const translations: Record<Language, TranslationsType> = {
  en,
  'zh-TW': zhTW
};

const I18nContext = createContext<I18nContextType>({
  t: (key: string) => key,
  language: 'en',
  setLanguage: () => {},
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, setPreferences } = useUserPreferences();
  const [language, setLanguage] = useState<Language>(preferences?.language || 'en');


  useEffect(() => {
    if (preferences?.language && preferences.language !== language) {
      setLanguage(preferences.language as Language);
    }
  }, [preferences?.language]);

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

  const setLanguageAndPersist = (newLang: Language) => {
    setPreferences(prev => ({
      ...prev,
      language: newLang
    }));
    setLanguage(newLang);
  };

  const value: I18nContextType = {
    t,
    language,
    setLanguage: setLanguageAndPersist,
  };

  return (
    <I18nContext.Provider value={value}>
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