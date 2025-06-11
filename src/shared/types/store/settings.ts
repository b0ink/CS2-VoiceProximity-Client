import { KeyCodeEvent } from '../keycodes';

export interface ClientVolumeMap {
  [steamId: string]: number;
}
export enum OcclusionQuality {
  OFF = 0,
  VERYLOW,
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
  occlusionAutoQuality: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  playerVolumes: ClientVolumeMap;
  muteKeybind: KeyCodeEvent[];
}

export const DEFAULT_PLAYER_VOLUME = 100;
export const MAX_PLAYER_VOLUME = 200;

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
  noiseSuppression: true,
  echoCancellation: true,
  playerVolumes: {},
  muteKeybind: [],
};
