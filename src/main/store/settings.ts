import { ipcMain } from 'electron';
import Store from 'electron-store';
import { KeyCodeEvent } from '@shared/types/keycodes';
import {
  ClientVolumeMap,
  DEFAULT_SETTINGS,
  MAX_PLAYER_VOLUME,
  SettingsData,
} from '@shared/types/store/settings';
import { setToggleMuteKeybind } from '../keybinds';
import { getMainWindow } from '../main-window';

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
          oldValue as KeyCodeEvent[] | undefined,
          newValue as KeyCodeEvent[] | undefined,
        );
      } catch (e) {
        console.error(`Failed to set mute keybind: ${e}`);
        settingsStore.set('muteKeybind', []);
        newValue = [];
      }
    }
    if (key === 'playerVolumes') {
      const volumes = newValue as ClientVolumeMap;
      for (const [id, vol] of Object.entries(volumes)) {
        volumes[id] = Math.max(0, Math.min(vol, MAX_PLAYER_VOLUME));
      }
      newValue = volumes;
    }
    getMainWindow()?.webContents.send('settings:update', { key, newValue });
  });
}

ipcMain.handle('settings:get', () => {
  return settingsStore.store;
});

ipcMain.handle('set-settings-value', async (_event, key: string, value: any) => {
  settingsStore.set(key, value);
  const mainWindow = getMainWindow();
  if (key === 'alwaysOnTop' && mainWindow) {
    mainWindow.setAlwaysOnTop(value);
  }
});

export default settingsStore;
