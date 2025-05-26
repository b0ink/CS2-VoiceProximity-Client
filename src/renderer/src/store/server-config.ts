import { writable } from 'svelte/store';
import type { ServerConfigData } from '@shared/types/store/server-config';

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
