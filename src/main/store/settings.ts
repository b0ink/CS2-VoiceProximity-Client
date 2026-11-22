import { ipcMain } from 'electron';
import Store from 'electron-store';
import { SERVER_URL_HINT, normalizeServerUrl } from '@shared/server-url';
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

// A server saved by an older version may be plain http or have a path. Re-check it so the token is
// never sent to an address that's no longer allowed; invalid ones are cleared, which sends the
// user back to region selection.
const savedServer = settingsStore.get('socketServer');
if (savedServer !== null && normalizeServerUrl(savedServer) !== savedServer) {
  settingsStore.set('socketServer', normalizeServerUrl(savedServer));
}

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
  if (key === 'socketServer' && value !== null && value !== '') {
    const serverUrl = normalizeServerUrl(value);
    if (!serverUrl) {
      throw new Error(SERVER_URL_HINT);
    }
    value = serverUrl;
  } else if (key === 'socketServer') {
    value = null;
  }

  settingsStore.set(key, value);
  const mainWindow = getMainWindow();
  if (key === 'alwaysOnTop' && mainWindow) {
    mainWindow.setAlwaysOnTop(value, 'normal');
  }
});

export default settingsStore;
