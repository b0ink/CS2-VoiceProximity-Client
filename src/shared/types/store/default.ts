import { ProgressInfo, UpdateInfo } from 'electron-updater';
import { DefaultNotificationOptions } from 'svelte-notifications';

interface Region {
  name: string;
  url: string;
  turn: string;
  stun: string;
  disabled: boolean;
  ping: number;
}

interface AutoUpdateState {
  state: 'error' | 'available' | 'downloading' | 'downloaded' | 'unavailable';
  error?: string;
  progress?: ProgressInfo;
  info?: UpdateInfo;
}

export interface StoreData {
  steamId: string | null;
  token: string | null;
  turnUsername: string | null;
  turnPassword: string | null;
  notification: DefaultNotificationOptions | null;
  savedRoomCode: string | null;
  tryReconnectRoom: boolean;
  regions: Region[];
  autoUpdateState: AutoUpdateState | null;
}

export const DEFAULT_STORE: StoreData = {
  steamId: null,
  token: null,
  turnUsername: null,
  turnPassword: null,
  notification: null,
  savedRoomCode: null,
  tryReconnectRoom: false,
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
  autoUpdateState: null,
};
