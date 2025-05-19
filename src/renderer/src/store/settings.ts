import { writable } from 'svelte/store';
import { DEFAULT_SOCKET_SERVER } from '../../../shared/constants';
import { OcclusionQuality, type SettingsData } from '../../../shared/types/store';

const settings = writable<SettingsData>({
  alwaysOnTop: true,
  natFixEnabled: true,
  hqVoice: false,
  inputDeviceId: null,
  socketServer: DEFAULT_SOCKET_SERVER,
  micMuted: false,
  globalGainAmount: 2.5,
  occlusionQuality: OcclusionQuality.HIGH,
});

window.api.getSettings().then((data) => {
  if (!data.socketServer) {
    data.socketServer = DEFAULT_SOCKET_SERVER;
  }
  console.log(`Renderer: getSettings() => ${JSON.stringify(data)}`);
  settings.set(data);
});

window.api.onSettingsUpdate(({ key, newValue }) => {
  console.log(`Renderer: onSettingsUpdate() => ${String(key)} ${newValue}`);
  settings.update((s) => ({ ...s, [key]: newValue }));
});

export default settings;
