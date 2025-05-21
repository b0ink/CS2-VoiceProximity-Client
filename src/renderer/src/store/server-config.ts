import { writable } from 'svelte/store';

export interface ServerConfigData {
  deadPlayerMuteDelay?: number; // seconds before players are muted after dying
  allowDeadTeamVoice?: boolean; // can dead teammates communicate to each other
  allowSpectatorC4Voice?: boolean; // can dead players speak when spectating C4
  rolloffFactor?: number; // How quickly player voice volumes are reduced as you move away from them
  refDistance?: number; // The distance at which the volume reduction starts taking effect
}

const serverConfigStore = writable<ServerConfigData>({
  deadPlayerMuteDelay: 1000,
  allowDeadTeamVoice: true,
  allowSpectatorC4Voice: true,
  rolloffFactor: 1,
  refDistance: 39,
});

export default serverConfigStore;
