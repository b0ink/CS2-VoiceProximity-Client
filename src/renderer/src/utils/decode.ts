import { decode } from '@msgpack/msgpack';
import type { ServerConfigData } from '@shared/types/api';
import { DEFAULT_SERVER_CONFIG } from '@shared/types/store/server-config';
import type { PlayerPositionApiData } from '../type';

export function decodePlayerData(data: Buffer<ArrayBufferLike>): PlayerPositionApiData[] {
  const decoded = decode(new Uint8Array(data));
  const players = decoded as Array<
    [string, string, number, number, number, number, number, number, number, boolean, boolean]
  >;

  const localPlayerData: PlayerPositionApiData[] = [];

  for (const player of players) {
    const [steamId, name, ox, oy, oz, lx, ly, lz, team, isAlive, spectatingC4] = player;

    // Cast to PlayerData interface
    const playerData: PlayerPositionApiData = {
      steamId,
      name,
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
    };
    localPlayerData.push(playerData);
  }

  return localPlayerData;
}

export function decodeServerConfig(data: Buffer): ServerConfigData {
  const raw = decode(new Uint8Array(data)) as Record<string, unknown>;
  const cfg = DEFAULT_SERVER_CONFIG;
  const decoded: ServerConfigData = {
    deadPlayerMuteDelay: (raw.DeadPlayerMuteDelay as number | undefined) ?? cfg.deadPlayerMuteDelay,
    allowDeadTeamVoice: (raw.AllowDeadTeamVoice as boolean | undefined) ?? cfg.allowDeadTeamVoice,
    allowSpectatorC4Voice:
      (raw.AllowSpectatorC4Voice as boolean | undefined) ?? cfg.allowSpectatorC4Voice,
    volumeFalloffFactor: (raw.VolumeFalloffFactor as number | undefined) ?? cfg.volumeFalloffFactor,
    volumeMaxDistance: (raw.VolumeMaxDistance as number | undefined) ?? cfg.volumeMaxDistance,
    occlusionNear: (raw.OcclusionNear as number | undefined) ?? cfg.occlusionNear,
    occlusionFar: (raw.OcclusionFar as number | undefined) ?? cfg.occlusionFar,
    occlusionEndDist: (raw.OcclusionEndDist as number | undefined) ?? cfg.occlusionEndDist,
    occlusionFalloffExponent:
      (raw.OcclusionFalloffExponent as number | undefined) ?? cfg.occlusionFalloffExponent,
  };
  return decoded;
}
