import { writable } from 'svelte/store';

export interface ServerConfigData {
  deadPlayerMuteDelay: number; // seconds before players are muted after dying
  allowDeadTeamVoice: boolean; // can dead teammates communicate to each other
  allowSpectatorC4Voice: boolean; // can dead players speak when spectating C4
  rolloffFactor: number; // How quickly player voice volumes are reduced as you move away from them
  refDistance: number; // The distance at which the volume reduction starts taking effect
  occlusionNear: number; // The maximum occlusion level for players fully behind a wall at the closest distance (0 is fully occluded)
  occlusionFar: number; // The maximum occlusion when player's distance reaches OcclusionEnd
  occlusionEndDist: number; // Distance from player where it fully reaches OcclusionFar
  occlusionFalloffExponent: number; // Controls how quickly occlusion drops off with distance (higher = steeper drop near end, lower = more gradual fade)
}

export const DEFAULT_SERVER_CONFIG: ServerConfigData = {
  deadPlayerMuteDelay: 1000,
  allowDeadTeamVoice: true,
  allowSpectatorC4Voice: true,
  rolloffFactor: 1,
  refDistance: 39,
  occlusionNear: 350,
  occlusionFar: 25,
  occlusionEndDist: 2000,
  occlusionFalloffExponent: 3,
};

const serverConfigStore = writable<ServerConfigData>({
  ...DEFAULT_SERVER_CONFIG,
});

export default serverConfigStore;
