import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';
import ping from 'ping';
import { MapData, ReverbZone } from '@shared/types/maps';
import { DEFAULT_STORE } from '@shared/types/store/default';
import { getMainWindow } from './main-window';
import { retrieveIceServers } from './retrieveIceServers';
import defaultStore from './store/default';

ipcMain.handle('get-ice-servers', async () => {
  return await retrieveIceServers();
});

ipcMain.handle('load-map', async (_event, map: string): Promise<MapData> => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.resolve(__dirname, '../../static/maps')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'maps'); // Is direct access to app.asar.unpacked really the best way ????

  const mapData = path.join(basePath, `${map}.json`);
  let reverbZones: ReverbZone[] | null = [];

  if (fs.existsSync(mapData)) {
    try {
      const raw = await fsp.readFile(mapData, 'utf-8');
      const parsed = JSON.parse(raw);

      // Parse reverb zones
      if (parsed.reverb) {
        reverbZones = parsed.reverb.map((zone: any) => {
          const reverbZone: ReverbZone = {
            label: zone.label,
            strength: Number(zone.strength),
            type: zone.type,
            fadeDistance: Number(zone.fadeDistance),
            fadeTime: Number(zone.fadeTime),
            vertices: zone.vertices.map(([x, y, z]: number[]) => ({ x, y, z })),
          };
          return reverbZone;
        });
      }
    } catch (err) {
      console.warn(`[Map] Failed to load doors JSON for ${map}:`, err);
      reverbZones = null;
    }
  }
  return {
    reverbZones,
  };
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

  defaultStore.set('regions', regions);
});

ipcMain.handle('toggle-mute-microphone', async () => {
  getMainWindow()?.webContents.send('toggle-mute-microphone');
});
