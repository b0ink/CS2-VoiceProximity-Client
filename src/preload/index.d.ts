import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: Api;
  }
  interface Api {
    getStoreValue: (key: string) => string | undefined; // Define your custom method here
    setStoreValue: (key: string, value: string) => void; // Example for another custom method
  }
}
