import { writable } from 'svelte/store';
import { DEFAULT_SERVER_CONFIG, type ServerConfigData } from '@shared/types/store/server-config';

const serverConfigStore = writable<ServerConfigData>({
  ...DEFAULT_SERVER_CONFIG,
});

export default serverConfigStore;
