import { ipcMain } from 'electron';
import Store from 'electron-store';
import {
  DEFAULT_PERSISTED_STORE,
  PersistedStoreData,
  StoreData,
} from '@shared/types/store/default';
import { getMainWindow } from '../main-window';
import { getToken, setToken } from './token';

const defaultStore = new Store<PersistedStoreData>({
  name: 'clientStore',
  defaults: {
    ...DEFAULT_PERSISTED_STORE,
  },
});

// Older versions saved the login token here in plain text. Remove it; those users sign in again.
(defaultStore as unknown as Store).delete('token');

// Client Store
defaultStore.events.setMaxListeners(
  defaultStore.events.getMaxListeners() + Object.keys(defaultStore.store).length,
);

for (const key of Object.keys(defaultStore.store) as (keyof PersistedStoreData)[]) {
  defaultStore.onDidChange(key, (newValue, oldValue) => {
    getMainWindow()?.webContents.send('store:update', { key, newValue });
    console.log(`Store onDidChange`, newValue, oldValue);
  });
}

// The renderer sees the token as part of this store, but it's stored separately (see token.ts).
ipcMain.handle('store:get', (): StoreData => {
  return { ...defaultStore.store, token: getToken() };
});

ipcMain.handle('set-store-value', async (_event, key: string, value: any) => {
  if (key === 'token') {
    setToken(value);
    return;
  }
  defaultStore.set(key, value);
});

export default defaultStore;
