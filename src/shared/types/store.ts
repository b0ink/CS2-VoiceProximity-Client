import { DefaultNotificationOptions } from 'svelte-notifications';

interface Region {
  name: string;
  url: string;
  turn: string;
  stun: string;
  disabled: boolean;
  ping: number;
}

export interface StoreData {
  steamId: string | null;
  token: string | null;
  turnUsername: string | null;
  turnPassword: string | null;
  notification: DefaultNotificationOptions | null;
  savedRoomCode: string | null;
  regions: Region[];
}
export const DEFAULT_STORE: StoreData = {
  steamId: null,
  token: null,
  turnUsername: null,
  turnPassword: null,
  notification: null,
  savedRoomCode: null,
  regions: [
    {
      name: 'Oceania',
      url: 'https://au.cs2voiceproximity.chat',
      turn: 'turn:turn.cs2voiceproximity.chat',
      stun: 'stun:turn.cs2voiceproximity.chat',
      disabled: false,
      ping: 0,
    },
    {
      name: 'Europe',
      url: 'https://eu.cs2voiceproximity.chat',
      turn: 'turn:eu.turn.cs2voiceproximity.chat',
      stun: 'stun:eu.turn.cs2voiceproximity.chat',
      disabled: false,
      ping: 0,
    },
  ],
};

export enum OcclusionQuality {
  OFF = 0,
  LOW,
  MEDIUM,
  HIGH,
}

interface ClientVolumeMap {
  [steamId: string]: number;
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
  occlusionAutoQuality: boolean;
  occlusionUpdateRate: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  playerVolumes: ClientVolumeMap;
}

export const DEFAULT_SETTINGS: SettingsData = {
  alwaysOnTop: true,
  natFixEnabled: true,
  hqVoice: false,
  inputDeviceId: null,
  socketServer: null,
  micMuted: false,
  globalGainAmount: 2.5,
  occlusionQuality: OcclusionQuality.HIGH,
  occlusionAutoQuality: true,
  occlusionUpdateRate: 2,
  noiseSuppression: true,
  echoCancellation: true,
  playerVolumes: {},
};
