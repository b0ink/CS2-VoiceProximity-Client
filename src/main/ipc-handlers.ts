import { app, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { retrieveTurnCredentials } from './retrieveTurnCredentials';

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
