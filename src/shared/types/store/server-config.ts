export interface ServerConfigData {
  deadPlayerMuteDelay: number; // seconds before players are muted after dying
  allowDeadTeamVoice: boolean; // can dead teammates communicate to each other
  allowSpectatorC4Voice: boolean; // can dead players speak when spectating C4
  volumeFalloffFactor: number; // How quickly player voice volumes are reduced as you move away from them
  volumeMaxDistance: number; // The distance at which the volume reduction starts taking effect
  occlusionNear: number; // The maximum occlusion level for players fully behind a wall at the closest distance (0 is fully occluded)
  occlusionFar: number; // The maximum occlusion when player's distance reaches OcclusionEnd
  occlusionEndDist: number; // Distance from player where it fully reaches OcclusionFar
  occlusionFalloffExponent: number; // Controls how quickly occlusion drops off with distance (higher = steeper drop near end, lower = more gradual fade)
  alwaysHearVisiblePlayers: boolean; // Players are audible if they are within view, regardless of max distance settings
  deadVoiceFilterFrequency: number; // How "thin" or radio-like players sound when dead (0 disables the effect)
  spectatorsCanTalk: boolean; // Can Ts & CTs hear spectators?
}

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
  spectatorsCanTalk: false,
};

export interface ConfigOption {
  key: keyof ServerConfigData;
  label: string;
  title?: string;
  placeholder?: string;
  type: 'number' | 'checkbox';
  changed: boolean;
}

export const ServerConfigOptions: ConfigOption[] = [
  {
    key: 'deadPlayerMuteDelay',
    label: 'Mute Delay on Death (s)',
    title: 'Delay before a dead player is muted (in seconds)',
    type: 'number',
    changed: false,
  },
  {
    key: 'volumeFalloffFactor',
    label: 'Volume Falloff Factor',
    title: 'How quickly volume fades with distance. (1 = Linear drop off)',
    type: 'number',
    changed: false,
  },
  {
    key: 'volumeMaxDistance',
    label: 'Volume Max Distance',
    title: 'Max distance at which player can be heard',
    type: 'number',
    changed: false,
  },
  {
    key: 'occlusionNear',
    label: 'Occlusion Near',
    title: 'Max occlusion when player is behind a wall',
    type: 'number',
    changed: false,
  },
  {
    key: 'occlusionFar',
    label: 'Occlusion Far',
    title: 'Max occlusion at the farthest distance (25 and below is inaudible)',
    type: 'number',
    changed: false,
  },
  {
    key: 'occlusionEndDist',
    label: 'Occlusion End Distance',
    title: 'Distance where occlusion reaches OcclusionFar value',
    type: 'number',
    changed: false,
  },
  {
    key: 'occlusionFalloffExponent',
    label: 'Occlusion Falloff Factor',
    title:
      'How fast occlusion increases with distance (1 = Linear fall off, 2 = Steeper drop at further distance)',
    type: 'number',
    changed: false,
  },
  {
    key: 'deadVoiceFilterFrequency',
    label: 'Dead Player Filter Frequency',
    title:
      'Applies a high-pass filter to dead player voices to make them sound thinner or more radio-like',
    type: 'number',
    changed: false,
  },
  {
    key: 'allowDeadTeamVoice',
    label: 'Dead teammates can hear other dead teammates',
    title: 'Dead players can hear and talk to other dead teammates',
    type: 'checkbox',
    changed: false,
  },
  {
    key: 'allowSpectatorC4Voice',
    label: 'Allow C4 Spectator Comms.',
    title: 'Dead players spectating the C4 can talk to alive players',
    type: 'checkbox',
    changed: false,
  },
  {
    key: 'alwaysHearVisiblePlayers',
    label: 'Always Hear Visible Players',
    title: 'Players are audible if they are within view, regardless of max distance settings',
    type: 'checkbox',
    changed: false,
  },
  {
    key: 'spectatorsCanTalk',
    label: 'Allow Spectators to Talk to Alive Players',
    title: 'When enabled, both Ts and CTs can hear spectators based on the their location',
    type: 'checkbox',
    changed: false,
  },
];
