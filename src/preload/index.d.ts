import { ElectronAPI } from '@electron-toolkit/preload';
import { StoreData } from '../shared/types/store';
import { SettingsData } from '../shared/types/store';
declare global {
  interface Window {
    electron: ElectronAPI;
    api: Api;
  }
  interface Api {
    setStoreValue: <K extends keyof StoreData>(key: K, value: StoreData[K]) => void;
    setSettingsValue: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;

    loadMap: (map: string) => string | undefined;
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

    toggleMuteMicrophone: (callback: () => void) => void;

    getRegionPings: () => void;
  }
}
