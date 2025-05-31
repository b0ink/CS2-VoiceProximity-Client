import { ServerConfigData } from '../api';

export const DEFAULT_SERVER_CONFIG: ServerConfigData = {
  deadPlayerMuteDelay: 1,
  allowDeadTeamVoice: true,
  allowSpectatorC4Voice: true,
  volumeFalloffFactor: 0.5,
  volumeMaxDistance: 2000,
  occlusionNear: 300,
  occlusionFar: 25,
  occlusionEndDist: 2000,
  occlusionFalloffExponent: 3,
  alwaysHearVisiblePlayers: true,
  deadVoiceFilterFrequency: 750,
};
