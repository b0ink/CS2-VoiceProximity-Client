import { decode } from '@msgpack/msgpack';
import type { ServerConfigData } from '@shared/types/api';
import { DEFAULT_SERVER_CONFIG } from '@shared/types/store/server-config';
import type { PlayerPositionApiData } from '../type';

export function decodePlayerData(data: Buffer<ArrayBufferLike>): PlayerPositionApiData[] {
  const decoded = decode(new Uint8Array(data));
  const players = decoded as Array<
    [
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
    ]
  >;

  const localPlayerData: PlayerPositionApiData[] = [];

  for (const player of players) {
    const [steamId, name, isAdmin, ox, oy, oz, lx, ly, lz, team, isAlive, spectatingC4] = player;

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
    deadPlayerMuteDelay:
      ((raw.DeadPlayerMuteDelay ?? raw.deadPlayerMuteDelay) as number | undefined) ??
      cfg.deadPlayerMuteDelay,
    allowDeadTeamVoice:
      ((raw.AllowDeadTeamVoice ?? raw.allowDeadTeamVoice) as boolean | undefined) ??
      cfg.allowDeadTeamVoice,
    allowSpectatorC4Voice:
      ((raw.AllowSpectatorC4Voice ?? raw.allowSpectatorC4Voice) as boolean | undefined) ??
      cfg.allowSpectatorC4Voice,
    volumeFalloffFactor:
      ((raw.VolumeFalloffFactor ?? raw.volumeFalloffFactor) as number | undefined) ??
      cfg.volumeFalloffFactor,
    volumeMaxDistance:
      ((raw.VolumeMaxDistance ?? raw.volumeMaxDistance) as number | undefined) ??
      cfg.volumeMaxDistance,
    occlusionNear:
      ((raw.OcclusionNear ?? raw.occlusionNear) as number | undefined) ?? cfg.occlusionNear,
    occlusionFar:
      ((raw.OcclusionFar ?? raw.occlusionFar) as number | undefined) ?? cfg.occlusionFar,
    occlusionEndDist:
      ((raw.OcclusionEndDist ?? raw.occlusionEndDist) as number | undefined) ??
      cfg.occlusionEndDist,
    occlusionFalloffExponent:
      ((raw.OcclusionFalloffExponent ?? raw.occlusionFalloffExponent) as number | undefined) ??
      cfg.occlusionFalloffExponent,
  };

  return decoded;
}
