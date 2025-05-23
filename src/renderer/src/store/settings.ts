import { writable } from 'svelte/store';
import { DEFAULT_SETTINGS, type SettingsData } from '../../../shared/types/store';

const settings = writable<SettingsData>(DEFAULT_SETTINGS);

window.api.getSettings().then((data) => {
  console.log(`Renderer: getSettings() => ${JSON.stringify(data)}`);
  settings.set(data);
});

window.api.onSettingsUpdate(({ key, newValue }) => {
  console.log(`Renderer: onSettingsUpdate() => ${String(key)} ${newValue}`);
  settings.update((s) => ({ ...s, [key]: newValue }));
});

export default settings;
