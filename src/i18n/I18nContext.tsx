import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './translations/en';
import { zhTW } from './translations/zh-TW';
import type { I18nContextType, Language, TranslationOptions } from '../types/i18n';
import { useUserPreferences } from '../context/UserPreferencesContext';

const translations: Record<Language, typeof en> = {
  'en': en,
  'zh-TW': zhTW as unknown as typeof en // Double type assertion to safely cast
};

export const I18nContext = createContext<I18nContextType>({
  t: (key: string) => key,
  language: 'en',
  setLanguage: () => {},
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, setPreferences } = useUserPreferences();
  const [language, setLanguage] = useState<Language>(
    preferences?.language === 'zh-TW' ? 'zh-TW' : 'en'
  );

  // Sync with preferences when they load
  useEffect(() => {
    if (preferences?.language && preferences.language !== language) {
      setLanguage(preferences.language as Language);
    }
  }, [preferences?.language]);

  const t = (key: string, options?: TranslationOptions): string => {
    try {
      const keys = key.split('.');
      let value = keys.reduce((obj: any, k) => obj?.[k], translations[language as Language]);

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

  const setLanguageWithValidation = async (newLang: Language) => {
    if (newLang !== 'en' && newLang !== 'zh-TW') {
      console.error('Invalid language selection:', newLang);
      return;
    }

    setLanguage(newLang);
    
    try {
      await setPreferences(prev => ({
        ...prev,
        language: newLang,
        lastUpdated: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error saving language preference:', err);
    }
  };

  const value: I18nContextType = {
    t,
    language: language as Language,
    setLanguage: setLanguageWithValidation,
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
