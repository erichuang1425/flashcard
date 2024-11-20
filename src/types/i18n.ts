import type { en } from '../i18n/translations/en';

export type Language = 'en' | 'zh-TW';

export type TranslationsType = typeof en;

export interface TranslationValues {
  [key: string]: string | number;
}

export interface TranslationOptions {
  values?: TranslationValues;
}

export interface I18nContextType {
  t: (key: string, options?: TranslationOptions) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}