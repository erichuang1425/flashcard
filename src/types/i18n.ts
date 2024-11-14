export type Language = 'en' | 'zh-TW';

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