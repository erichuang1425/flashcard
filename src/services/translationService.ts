import axios from 'axios';
import { convertToTraditional } from '../utils/chineseConverter';

const GOOGLE_TRANSLATE_API_KEY = import.meta.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

export interface TranslationResponse {
  text: string;
  detectedSourceLang?: string;
}

export const translateText = async (
  text: string, 
  targetLang: string = 'en'
): Promise<TranslationResponse> => {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('Google Translate API key is not configured');
  }

  try {
    const response = await axios.post(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      q: text,
      target: targetLang
    });

    if (response.data.data.translations && response.data.data.translations.length > 0) {
      return {
        text: response.data.data.translations[0].translatedText,
        detectedSourceLang: response.data.data.translations[0].detectedSourceLanguage
      };
    }

    throw new Error('No translation data received');
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

export const translateToTraditionalChinese = async (text: string): Promise<string> => {
  try {
    // First translate to simplified Chinese
    const response = await translateText(text, 'zh-CN');
    // Then convert to traditional Chinese
    return convertToTraditional(response.text);
  } catch (error) {
    console.error('Translation to traditional Chinese failed:', error);
    throw error;
  }
};
