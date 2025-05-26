import { writable } from 'svelte/store';
import type { ServerConfigData } from '@shared/types/api';
import { DEFAULT_SERVER_CONFIG } from '@shared/types/store/server-config';

const serverConfigStore = writable<ServerConfigData>({
  ...DEFAULT_SERVER_CONFIG,
});

export default serverConfigStore;
