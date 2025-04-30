import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: Api;
  }
  interface Api {
    getStoreValue: (key: string, defaultValue?: string) => string | undefined;
    setStoreValue: (key: string, value: string) => void;
    loadMap: (map: string) => string | undefined;
    getSocketUrl: () => string;
    reloadApp: () => void;
    promptSteamAuthentication: () => void;
  }
}
