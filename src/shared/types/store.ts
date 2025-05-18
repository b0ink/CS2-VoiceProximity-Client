import { DefaultNotificationOptions } from 'svelte-notifications';

export interface StoreData {
  steamId: string | null;
  token: string | null;
  turnUsername: string | null;
  turnPassword: string | null;
  notification: DefaultNotificationOptions | null;
  savedRoomCode: string | null;
}

export interface SettingsData {
  alwaysOnTop: boolean;
  natFixEnabled: boolean;
  hqVoice: boolean;
  inputDeviceId: string | null;
  socketServer: string | null;
  micMuted: boolean;
}
