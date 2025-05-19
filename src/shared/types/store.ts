import { DefaultNotificationOptions } from 'svelte-notifications';
import { DEFAULT_SOCKET_SERVER } from '../constants';

export interface StoreData {
  steamId: string | null;
  token: string | null;
  turnUsername: string | null;
  turnPassword: string | null;
  notification: DefaultNotificationOptions | null;
  savedRoomCode: string | null;
}
export const DEFAULT_STORE: StoreData = {
  steamId: null,
  token: null,
  turnUsername: null,
  turnPassword: null,
  notification: null,
  savedRoomCode: null,
};

export enum OcclusionQuality {
  OFF = 0,
  LOW,
  MEDIUM,
  HIGH,
}
export interface SettingsData {
  alwaysOnTop: boolean;
  natFixEnabled: boolean;
  hqVoice: boolean;
  inputDeviceId: string | null;
  socketServer: string | null;
  micMuted: boolean;
  globalGainAmount: number;
  occlusionQuality: OcclusionQuality;
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  alwaysOnTop: true,
  natFixEnabled: true,
  hqVoice: false,
  inputDeviceId: null,
  socketServer: DEFAULT_SOCKET_SERVER,
  micMuted: false,
  globalGainAmount: 2.5,
  occlusionQuality: OcclusionQuality.HIGH,
  noiseSuppression: true,
  echoCancellation: true,
};
