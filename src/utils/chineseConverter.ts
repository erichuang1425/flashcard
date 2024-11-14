import * as OpenCC from 'opencc-js';

const converter = new OpenCC.Converter({ from: 'cn', to: 'tw' });

export const convertToTraditional = (text: string): string => {
  try {
    return converter.convert(text);
  } catch (error) {
    console.error('Error converting to traditional Chinese:', error);
    return text;
  }
};
