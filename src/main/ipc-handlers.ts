import { ipcMain } from 'electron';
import Store from 'electron-store';

const store = new Store();

ipcMain.handle('get-store-value', async (event, key: string) => {
  console.log(event);
  return store.get(key);
});

ipcMain.handle('set-store-value', async (event, key: string, value: any) => {
  console.log(event);
  store.set(key, value);
});
