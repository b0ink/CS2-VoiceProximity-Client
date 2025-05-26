import { ServerConfigData } from '../api';

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
