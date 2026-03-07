import { decode } from '@msgpack/msgpack';
import { DEFAULT_SERVER_CONFIG, type ServerConfigData } from '@shared/types/store/server-config';
import type { PlayerPositionApiData } from '../type';

type PackedPlayerData = [
  string, // steamId
  string, // name
  boolean, // isAdmin
  number, // originX
  number, // originY
  number, // originZ
  number, // lookAtX
  number, // lookAtY
  number, // lookAtZ
  number, // team
  boolean, // isAlive
  boolean, // spectatingC4
  number?, // listener-specific occlusion
];

export function decodePlayerData(data: Buffer<ArrayBufferLike>): PlayerPositionApiData[] {
  const decoded = decode(new Uint8Array(data));
  const players = decoded as PackedPlayerData[];

  const localPlayerData: PlayerPositionApiData[] = [];

  for (const player of players) {
    const [steamId, name, isAdmin, ox, oy, oz, lx, ly, lz, team, isAlive, spectatingC4, occlusion] =
      player;
    const playerOcclusion =
      typeof occlusion === 'number' && Number.isFinite(occlusion) ? occlusion : 0;

    // Cast to PlayerData interface
    const playerData: PlayerPositionApiData = {
      steamId,
      name,
      isAdmin,
      // The server plugin scales our Origin/LookAt floats to integers so that we're not dealing with decimals
      // Now we need to scale them down
      originX: ox / 10000,
      originY: oy / 10000,
      originZ: oz / 10000,
      lookAtX: lx / 10000,
      lookAtY: ly / 10000,
      lookAtZ: lz / 10000,
      team,
      isAlive,
      spectatingC4,
      occlusion: playerOcclusion,
    };
    localPlayerData.push(playerData);
  }

  return localPlayerData;
}

export function decodeServerConfig(data: Buffer): ServerConfigData {
  const raw = decode(new Uint8Array(data)) as Record<string, unknown>;
  const cfg = DEFAULT_SERVER_CONFIG;

  // decode server config from either the cs2 plugin or the api that have different casing

  const decoded: ServerConfigData = {
    ...DEFAULT_SERVER_CONFIG,
  };

  for (const key of Object.keys(cfg) as Array<keyof ServerConfigData>) {
    assignDecodedValue(decoded, raw, cfg, key);
  }

  return decoded;
}

function assignDecodedValue<K extends keyof ServerConfigData>(
  target: ServerConfigData,
  raw: Record<string, unknown>,
  fallback: ServerConfigData,
  key: K,
): void {
  const upper = key[0].toUpperCase() + key.slice(1);
  const val = raw[upper] ?? raw[key] ?? fallback[key];
  target[key] = val as ServerConfigData[K];
}
