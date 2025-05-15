import { writable } from 'svelte/store';
import type { SettingsData } from '../../../shared/types/store';

const defaultSocketServer = 'https://cs2voiceproximity.chat';
const settings = writable<SettingsData>({
  alwaysOnTop: true,
  natFixEnabled: true,
  hqVoice: true,
  inputDeviceId: null,
  socketServer: defaultSocketServer,
});

window.api.getSettings().then((data) => {
  if (!data.socketServer) {
    data.socketServer = defaultSocketServer;
  }
  console.log(`Renderer: getSettings() => ${JSON.stringify(data)}`);
  settings.set(data);
});

window.api.onSettingsUpdate(({ key, newValue }) => {
  console.log(`Renderer: onSettingsUpdate() => ${String(key)} ${newValue}`);
  settings.update((s) => ({ ...s, [key]: newValue }));
});

export default settings;
