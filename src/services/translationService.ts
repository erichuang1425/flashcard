import { getFunctions, httpsCallable } from 'firebase/functions';


export interface TranslationResponse {
  text: string;
  detectedSourceLang?: string;
}

const functions = getFunctions();

export const translateText = async (text: string, targetLang: string = 'en'): Promise<TranslationResponse> => {
  const translateFn = httpsCallable(functions, 'translateText');
  
  try {
    const result = await translateFn({ text, targetLang });
    return result.data as TranslationResponse;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

export const translateToTraditionalChinese = async (text: string): Promise<string> => {
  const translateFn = httpsCallable(functions, 'translateToTraditionalChinese');
  
  try {
    const result = await translateFn({ text });
    return (result.data as { text: string }).text;
  } catch (error) {
    console.error('Translation to traditional Chinese failed:', error);
    throw error;
  }
};
