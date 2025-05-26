import { KeyCodeEvent } from '../keycodes';

interface ClientVolumeMap {
  [steamId: string]: number;
}
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
  occlusionAutoQuality: boolean;
  occlusionUpdateRate: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  playerVolumes: ClientVolumeMap;
  muteKeybind: KeyCodeEvent[];
}

export const DEFAULT_SETTINGS: SettingsData = {
  alwaysOnTop: false,
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
  muteKeybind: [],
};
