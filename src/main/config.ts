import { app } from 'electron';

export function getApiUrl() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return 'http://127.0.0.1:3000';
  }
  return 'https://cs2voiceproximity.chat';
}
