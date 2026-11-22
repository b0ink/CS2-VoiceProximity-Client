// This preload runs sandboxed: it can only import 'electron' (plus bundled code), never node_modules.
import { contextBridge, ipcRenderer } from 'electron';
import { StoreData } from '@shared/types/store/default';
import { SettingsData } from '@shared/types/store/settings';
import { version } from '../../package.json';

// Custom APIs for renderer
const api = {
  setStoreValue: <K extends keyof StoreData>(key: K, value: StoreData[K]) =>
    ipcRenderer.invoke('set-store-value', key, value),

  setSettingsValue: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    ipcRenderer.invoke('set-settings-value', key, value),

  loadMap: (map: string) => ipcRenderer.invoke('load-map', map),
  reloadApp: () => ipcRenderer.invoke('reload-app'),
  promptSteamAuthentication: () => ipcRenderer.invoke('prompt-steam-authentication'),
  retrieveIceServers: () => ipcRenderer.invoke('get-ice-servers'),
  clientVersion: () => version,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  getSettings: () => ipcRenderer.invoke('settings:get'),
  onSettingsUpdate: (callback: (data: { key: string; newValue: any }) => void) => {
    ipcRenderer.on('settings:update', (_event, data) => callback(data));
  },

  getStore: () => ipcRenderer.invoke('store:get'),
  onStoreUpdate: (callback: (data: { key: string; newValue: any }) => void) => {
    ipcRenderer.on('store:update', (_event, data) => callback(data));
  },

  getRegionPings: () => ipcRenderer.invoke('get-region-pings'),

  onToggleMuteMicrophone: (callback: () => void) => {
    ipcRenderer.on('toggle-mute-microphone', () => callback());
  },
  toggleMuteMicrophone: () => ipcRenderer.invoke('toggle-mute-microphone'),

  downloadUpdate: () => ipcRenderer.invoke('update-app'),

  quitApp: () => ipcRenderer.invoke('quit-app'),
};

// Only this narrow API is exposed. Don't expose raw `ipcRenderer` or `process` (e.g. via
// @electron-toolkit/preload's electronAPI): that would let page script reach any IPC channel
// and read environment variables.
contextBridge.exposeInMainWorld('api', api);
