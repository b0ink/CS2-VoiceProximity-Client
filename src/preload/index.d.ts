import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: Api;
  }
  interface Api {
    getStoreValue: (key: string, defaultValue?: string) => any | undefined;
    setStoreValue: (key: string, value: any) => void;
    loadMap: (map: string) => string | undefined;
    getSocketUrl: () => string;
    reloadApp: () => void;
    promptSteamAuthentication: () => void;
    retrieveTurnCredentials: () => void;
  }
}
