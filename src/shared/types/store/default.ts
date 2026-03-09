import { ProgressInfo, UpdateInfo } from 'electron-updater';
import { DefaultNotificationOptions } from 'svelte-notifications';
import { IceServer } from '../api';

interface Region {
  name: string;
  url: string;
  // turn: string;
  // stun: string;
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
  iceServers: IceServer[];
  forceRelayOnly: boolean;
  notification: DefaultNotificationOptions | null;
  savedRoomCode: string | null;
  tryReconnectRoom: boolean;
  regions: Region[];
  autoUpdateState: AutoUpdateState | null;
}

export const DEFAULT_STORE: StoreData = {
  steamId: null,
  token: null,
  iceServers: [],
  forceRelayOnly: true,
  notification: null,
  savedRoomCode: null,
  tryReconnectRoom: false,
  regions: [
    {
      name: 'Oceania',
      url: 'https://au.cs2voiceproximity.chat',
      disabled: false,
      ping: 0,
    },
    {
      name: 'Europe',
      url: 'https://eu.cs2voiceproximity.chat',
      disabled: false,
      ping: 0,
    },
    {
      name: 'US (Dallas)',
      url: 'https://us-central.cs2voiceproximity.chat',
      disabled: false,
      ping: 0,
    },
  ],
  autoUpdateState: null,
};
