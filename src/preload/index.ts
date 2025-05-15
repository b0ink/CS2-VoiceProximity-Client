import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { version } from '../../package.json';

// Custom APIs for renderer
const api = {
  getStoreValue: (key: string, defaultValue?: string) =>
    ipcRenderer.invoke('get-store-value', key, defaultValue),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
  getSettingsValue: (key: string, defaultValue?: string) =>
    ipcRenderer.invoke('get-settings-value', key, defaultValue),
  setSettingsValue: (key: string, value: any) =>
    ipcRenderer.invoke('set-settings-value', key, value),
  loadMap: (map: string) => ipcRenderer.invoke('load-map', map),
  getSocketUrl: () => ipcRenderer.invoke('get-socket-url'),
  reloadApp: () => ipcRenderer.invoke('reload-app'),
  promptSteamAuthentication: () => ipcRenderer.invoke('prompt-steam-authentication'),
  retrieveTurnCredentials: () => ipcRenderer.invoke('get-turn-credentials'),
  clientVersion: () => version,
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
