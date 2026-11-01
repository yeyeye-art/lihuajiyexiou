/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSETS_BASE_URL?: string;
  readonly VITE_DATA_BASE_URL?: string;
  readonly VITE_XIAOLI_VOICE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
