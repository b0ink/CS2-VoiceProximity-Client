import { app, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import ping from 'ping';
import { DEFAULT_STORE } from '../shared/types/store';
import { retrieveTurnCredentials } from './retrieveTurnCredentials';
import { store } from './store';

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

ipcMain.handle('get-region-pings', async () => {
  const regions = DEFAULT_STORE.regions;

  await Promise.all(
    regions.map(async (region) => {
      const hostname = new URL(region.url).hostname;
      const res = await ping.promise.probe(hostname);
      region.ping = res.time !== 'unknown' ? res.time : -1;
    }),
  );

  store.set('regions', regions);
});
