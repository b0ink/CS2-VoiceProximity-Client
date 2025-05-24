import { BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import { DEFAULT_SETTINGS, DEFAULT_STORE, SettingsData, StoreData } from '../shared/types/store';
import { setToggleMuteKeybind } from './keybinds';
import { KeyCodeEvent } from '../shared/types/keycodes';

let mainWindowRef: BrowserWindow | null = null;

const store = new Store<StoreData>({
  name: 'clientStore',
  defaults: {
    ...DEFAULT_STORE,
  },
});
const settingsStore = new Store<SettingsData>({
  name: 'settings',
  defaults: {
    ...DEFAULT_SETTINGS,
  },
});

// Settings store
settingsStore.events.setMaxListeners(
  settingsStore.events.getMaxListeners() + Object.keys(settingsStore.store).length,
);

for (const key of Object.keys(settingsStore.store) as (keyof SettingsData)[]) {
  settingsStore.onDidChange(key, (newValue, oldValue) => {
    console.log(`Settings onDidChange`, newValue, oldValue);
    if (key == 'socketServer') {
      if (!newValue) {
        // Force user to select region again
        newValue = null;
      }
    }
    if (key === 'muteKeybind') {
      try {
        setToggleMuteKeybind(
          mainWindowRef,
          oldValue as KeyCodeEvent[] | undefined,
          newValue as KeyCodeEvent[] | undefined,
        );
      } catch (e) {
        console.error(`Failed to set mute keybind: ${e}`);
        settingsStore.set('muteKeybind', []);
        newValue = [];
      }
    }
    mainWindowRef?.webContents.send('settings:update', { key, newValue });
  });
}

// Client Store
store.events.setMaxListeners(store.events.getMaxListeners() + Object.keys(store.store).length);

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
