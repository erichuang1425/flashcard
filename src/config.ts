interface Config {
  GOOGLE_TRANSLATE_API_KEY: string;
  DEEPL_API_KEY: string;
  // Add other environment variables here
}

// For Vite, use import.meta.env
export const config: Config = {
  GOOGLE_TRANSLATE_API_KEY: import.meta.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY || '',
  DEEPL_API_KEY: import.meta.env.VITE_DEEPL_API_KEY || '',
  // Add other environment variables here
};