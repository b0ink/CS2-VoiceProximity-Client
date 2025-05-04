import { app, ipcMain } from 'electron';
import Store from 'electron-store';
import fs from 'fs/promises';
import path from 'path';
import { getApiUrl } from './config';
import { StoreData } from './types';
import { retrieveTurnCredentials } from './retrieveTurnCredentials';

const store = new Store<StoreData>();

ipcMain.handle('get-store-value', async (_event, key: string, defaultValue?: string) => {
  return store.get(key, defaultValue);
});

ipcMain.handle('set-store-value', async (_event, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('get-turn-credentials', async () => {
  return await retrieveTurnCredentials();
});

ipcMain.handle('load-map', async (_event, map: string) => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.resolve(__dirname, '../../static/maps')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'maps'); // Is direct access to app.asar.unpacked really the best way ????

  const filePath = path.join(basePath, `${map}.glb`);

  return await fs.readFile(filePath);
});

// TODO: replace with get-store-value once there's a UI for settings
ipcMain.handle('get-socket-url', async () => {
  return getApiUrl();
});
