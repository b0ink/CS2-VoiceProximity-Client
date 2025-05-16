import { BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import { SettingsData, StoreData } from '../shared/types/store';

let mainWindowRef: BrowserWindow | null = null;

const store = new Store<StoreData>({
  name: 'clientStore',
  defaults: {
    steamId: null,
    token: null,
    turnUsername: null,
    turnPassword: null,
    notification: null,
    savedRoomCode: null,
  },
});
const settingsStore = new Store<SettingsData>({
  name: 'settings',
  defaults: {
    socketServer: 'https://cs2voiceproximity.chat',
    alwaysOnTop: true,
    natFixEnabled: true,
    hqVoice: false,
    inputDeviceId: null,
  },
});

const defaultSocketServer = 'https://cs2voiceproximity.chat';
// Settings store
for (const key of Object.keys(settingsStore.store) as (keyof SettingsData)[]) {
  settingsStore.onDidChange(key, (newValue, oldValue) => {
    console.log(`Settings onDidChange`, newValue, oldValue);
    if (key == 'socketServer') {
      if (!newValue) {
        //TODO: regex the url either here or in the ui
        newValue = defaultSocketServer;
      }
    }
    mainWindowRef?.webContents.send('settings:update', { key, newValue });
  });
}

// Client Store
for (const key of Object.keys(store.store) as (keyof StoreData)[]) {
  store.onDidChange(key, (newValue, oldValue) => {
    mainWindowRef?.webContents.send('store:update', { key, newValue });
    console.log(`Store onDidChange`, newValue, oldValue);
  });
}

ipcMain.handle('settings:get', () => {
  return settingsStore.store;
});

ipcMain.handle('store:get', () => {
  return store.store;
});

ipcMain.handle('set-store-value', async (_event, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('set-settings-value', async (_event, key: string, value: any) => {
  settingsStore.set(key, value);
  if (key === 'alwaysOnTop' && mainWindowRef) {
    mainWindowRef.setAlwaysOnTop(value);
  }
});

export function setMainWindow(win: BrowserWindow): void {
  mainWindowRef = win;
}

export { settingsStore, store };
