import { app, ipcMain } from 'electron';
import Store from 'electron-store';
import path from 'path';
import fs from 'fs/promises';

const store = new Store();

ipcMain.handle('get-store-value', async (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', async (_event, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('load-map', async (_event, map: string) => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.resolve(__dirname, '../../static/maps')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'maps'); // Is direct access to app.asar.unpacked really the best way ????

  const filePath = path.join(basePath, `${map}.glb`);

  return await fs.readFile(filePath);
});
