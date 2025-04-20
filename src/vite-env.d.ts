/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_SOCKET_URL: string;
  VITE_MEDIA_SAMPLERATE: number;
  VITE_MEDIA_SAMPLESIZE: number;
  VITE_USE_TURN_CONFIG: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
