import axios from 'axios';

export interface GrammarIssue {
  message: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
}

export const checkGrammar = async (
  text: string,
  language: string = 'en-US'
): Promise<GrammarIssue[]> => {
  try {
    const params = new URLSearchParams({ text, language });
    const res = await axios.post(
      'https://api.languagetool.org/v2/check',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return res.data?.matches || [];
  } catch (err) {
    console.error('Grammar check failed:', err);
    return [];
  }
};

export default checkGrammar;
