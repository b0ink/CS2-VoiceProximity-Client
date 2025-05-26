import { ipcMain } from 'electron';
import Store from 'electron-store';
import { DEFAULT_STORE, StoreData } from '@shared/types/store/default';
import { getMainWindow } from '../main-window';

const defaultStore = new Store<StoreData>({
  name: 'clientStore',
  defaults: {
    ...DEFAULT_STORE,
  },
});

// Client Store
defaultStore.events.setMaxListeners(
  defaultStore.events.getMaxListeners() + Object.keys(defaultStore.store).length,
);

for (const key of Object.keys(defaultStore.store) as (keyof StoreData)[]) {
  defaultStore.onDidChange(key, (newValue, oldValue) => {
    getMainWindow()?.webContents.send('store:update', { key, newValue });
    console.log(`Store onDidChange`, newValue, oldValue);
  });
}

ipcMain.handle('store:get', () => {
  return defaultStore.store;
});

ipcMain.handle('set-store-value', async (_event, key: string, value: any) => {
  defaultStore.set(key, value);
});

export default defaultStore;
