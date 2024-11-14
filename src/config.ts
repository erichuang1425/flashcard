interface Config {
  GOOGLE_TRANSLATE_API_KEY: string;
}

// For Vite, use import.meta.env
export const config: Config = {
  GOOGLE_TRANSLATE_API_KEY: import.meta.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY || '',
};