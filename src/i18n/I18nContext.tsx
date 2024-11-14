import React, { createContext, useContext, useState } from 'react';
import { en } from './translations/en';
import { zhTW } from './translations/zh-TW';
import type { I18nContextType, Language, TranslationOptions } from '../types/i18n';
import { useUserPreferences } from '../context/UserPreferencesContext';

const translations = {
  'en': en,
  'zh-TW': zhTW
};

export const I18nContext = createContext<I18nContextType>({
  t: (key: string) => key,
  language: 'en',
  setLanguage: () => {},
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, setPreferences } = useUserPreferences();

  const t = (key: string, options?: TranslationOptions): string => {
    try {
      const keys = key.split('.');
      let value = keys.reduce((obj, k) => obj[k], translations[preferences.language] as any);

      if (typeof value !== 'string') return key;

      if (options?.values) {
        Object.entries(options.values).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        });
      }

      return value;
    } catch (error) {
      console.error(`Translation missing for key: ${key}`);
      return key;
    }
  };

  const setLanguage = (newLang: 'en' | 'zh-TW') => {
    setPreferences(prev => ({
      ...prev,
      language: newLang
    }));
  };

  const value: I18nContextType = {
    t,
    language: preferences.language,
    setLanguage,
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
