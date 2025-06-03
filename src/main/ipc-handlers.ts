import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';
import ping from 'ping';
import { DEFAULT_STORE } from '@shared/types/store/default';
import { getMainWindow } from './main-window';
import { retrieveTurnCredentials } from './retrieveTurnCredentials';
import defaultStore from './store/default';

ipcMain.handle('get-turn-credentials', async () => {
  return await retrieveTurnCredentials();
});

// TODO: move these interfaces somewhere appropriate
export interface MapDoor {
  label: string;
  rotateOffset: number;
  absOrigin: {
    x: number;
    y: number;
    z: number;
  };
  startingRotation: {
    x: number;
    y: number;
    z: number;
  };
  axis: {
    x: number;
    y: number;
    z: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export interface Map {
  buffer: Buffer<ArrayBufferLike>;
  doors: MapDoor[];
}

ipcMain.handle('load-map', async (_event, map: string): Promise<Map> => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.resolve(__dirname, '../../static/maps')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'maps'); // Is direct access to app.asar.unpacked really the best way ????

  const mapPath = path.join(basePath, `${map}.glb`);
  const rawMapBuffer = await fsp.readFile(mapPath);

  const mapDoors = path.join(basePath, `${map}.json`);
  let doors: MapDoor[] = [];

  if (fs.existsSync(mapDoors)) {
    try {
      const raw = await fsp.readFile(mapDoors, 'utf-8');
      const parsed = JSON.parse(raw);

      doors = parsed.map((entry: any) => {
        const [x, y, z] = entry.absorigin.split(' ').map(Number);
        const [rx, ry, rz] = entry.startRotation.split(' ').map(Number);
        const [ax, ay, az] = entry.axis.split(' ').map(Number);

        const door: MapDoor = {
          label: entry.label,
          rotateOffset: Number(entry.rotateOffset),
          absOrigin: { x, y, z },
          startingRotation: { x: rx, y: ry, z: rz },
          axis: { x: ax, y: ay, z: az },
          size: {
            width: Number(entry.doorWidth),
            height: Number(entry.doorHeight),
          },
        };
        return door;
      });
    } catch (err) {
      console.warn(`[Map] Failed to load doors JSON for ${map}:`, err);
    }
  }
  return {
    buffer: rawMapBuffer,
    doors,
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
