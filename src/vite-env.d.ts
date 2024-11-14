/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPL_API_KEY: string
  readonly REACT_APP_GOOGLE_TRANSLATE_API_KEY: string
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
