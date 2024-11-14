export interface TranslationResponse {
  text: string;
  from: string;
  to: string;
}

export interface TranslationError {
  message: string;
  code: string;
}

export class TranslationError extends Error {
  code: string;

  constructor(message: string, code: string = 'TRANSLATION_ERROR') {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

export interface ConversionResponse {
  text: string;
  success: boolean;
}

export interface ConversionError {
  message: string;
}
