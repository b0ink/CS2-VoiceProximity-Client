import { app, ipcMain } from 'electron';
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

ipcMain.handle('load-map', async (_event, map: unknown): Promise<MapData> => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.resolve(__dirname, '../../static/maps')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'maps'); // Is direct access to app.asar.unpacked really the best way ????

  // The map name comes from the server, so it's never used to build a path: only a file that's
  // actually in the maps folder is opened. Unknown maps get no zones, as before.
  if (typeof map !== 'string') {
    return { reverbZones: [] };
  }
  const fileName = `${map}.json`;
  const mapFiles = await fsp.readdir(basePath).catch((): string[] => []);
  if (!mapFiles.includes(fileName)) {
    return { reverbZones: [] };
  }

  let reverbZones: ReverbZone[] | null = [];
  try {
    const raw = await fsp.readFile(path.join(basePath, fileName), 'utf-8');
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
  return {
    reverbZones,
  };
});

ipcMain.handle('get-region-pings', async () => {
  const regions = DEFAULT_STORE.regions;

  await Promise.all(
    regions.map(async (region) => {
      try {
        const hostname = new URL(region.url).hostname;
        const res = await ping.promise.probe(hostname);

        if (!res.alive) {
          region.ping = -1;
          return;
        }

        const response = await fetch(region.url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        region.ping = response.ok ? Number(res.time) : -1;
      } catch {
        region.ping = -1;
      }
    }),
  );

  defaultStore.set('regions', regions);
});

ipcMain.handle('toggle-mute-microphone', async () => {
  getMainWindow()?.webContents.send('toggle-mute-microphone');
});
