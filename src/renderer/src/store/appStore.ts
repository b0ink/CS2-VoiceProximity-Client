import { derived, writable } from 'svelte/store';

export const nextServerRestart = writable(0);
export const currentTime = writable(Date.now() / 1000);
export const timeUntilRestart = derived(
  [nextServerRestart, currentTime],
  ([$nextServerRestart, $currentTime]) => $nextServerRestart - $currentTime,
);
export const settingsOpen = writable(false);
export const serverConfigOverlayOpen = writable(false);
