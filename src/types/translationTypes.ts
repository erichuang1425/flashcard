export interface TranslationResponse {
  text: string;
  from: string;
  to: string;
}

export interface TranslationError {
  message: string;
  code: string;
}

export interface ConversionResponse {
  text: string;
  success: boolean;
}

export interface ConversionError {
  message: string;
}
