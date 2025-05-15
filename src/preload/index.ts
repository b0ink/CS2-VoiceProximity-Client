import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { version } from '../../package.json';
import { SettingsData, StoreData } from '../shared/types/store';

console.log('HELLo');
// Custom APIs for renderer
const api = {
  setStoreValue: <K extends keyof StoreData>(key: K, value: StoreData[K]) =>
    ipcRenderer.invoke('set-store-value', key, value),

  setSettingsValue: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    ipcRenderer.invoke('set-settings-value', key, value),

  loadMap: (map: string) => ipcRenderer.invoke('load-map', map),
  reloadApp: () => ipcRenderer.invoke('reload-app'),
  promptSteamAuthentication: () => ipcRenderer.invoke('prompt-steam-authentication'),
  retrieveTurnCredentials: () => ipcRenderer.invoke('get-turn-credentials'),
  clientVersion: () => version,

  getSettings: () => ipcRenderer.invoke('settings:get'),
  onSettingsUpdate: (callback: (data: { key: string; newValue: any }) => void) => {
    ipcRenderer.on('settings:update', (_event, data) => callback(data));
  },

  getStore: () => ipcRenderer.invoke('store:get'),
  onStoreUpdate: (callback: (data: { key: string; newValue: any }) => void) => {
    ipcRenderer.on('store:update', (_event, data) => callback(data));
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
