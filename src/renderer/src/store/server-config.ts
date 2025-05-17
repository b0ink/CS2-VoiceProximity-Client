import { writable } from 'svelte/store';

export interface ServerConfigData {
  deadPlayerMuteDelay: number; // seconds before players are muted after dying
  allowDeadTeamVoice: boolean; // can dead teammates communicate to each other
  allowSpectatorC4Voice: boolean; // can dead players speak when spectating C4
}

const serverConfigStore = writable<ServerConfigData>({
  deadPlayerMuteDelay: 1000,
  allowDeadTeamVoice: true,
  allowSpectatorC4Voice: true,
});

export default serverConfigStore;
