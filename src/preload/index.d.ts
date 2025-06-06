import { ElectronAPI } from '@electron-toolkit/preload';
import type { MapData } from '@shared/types/maps';
import { StoreData } from '@shared/types/store/default';
import { SettingsData } from '@shared/types/store/settings';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: Api;
  }
  interface Api {
    setStoreValue: <K extends keyof StoreData>(key: K, value: StoreData[K]) => void;
    setSettingsValue: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;

    loadMap: (map: string) => Promise<MapData>;
    reloadApp: () => void;
    promptSteamAuthentication: () => void;
    retrieveTurnCredentials: () => void;
    clientVersion: () => string;

    getSettings: () => Promise<SettingsData>;
    onSettingsUpdate: (
      callback: (data: { key: keyof SettingsData; newValue: any }) => void,
    ) => void;

    getStore: () => Promise<StoreData>;
    onStoreUpdate: (callback: (data: { key: keyof StoreData; newValue: any }) => void) => void;

    onToggleMuteMicrophone: (callback: () => void) => void;
    toggleMuteMicrophone: () => void;

    getRegionPings: () => void;

    downloadUpdate: () => void;
  }
}
