import { globalShortcut } from 'electron';
import { KeyCodeEvent } from '../shared/types/keycodes';
import { getMainWindow } from './main-window';

export function setToggleMuteKeybind(
  oldKeybind: KeyCodeEvent[] | undefined,
  newKeybind: KeyCodeEvent[] | undefined,
): void {
  if (oldKeybind !== undefined && oldKeybind.length > 0) {
    const keybind = oldKeybind.map(normalizeKey).join('+');
    console.log(`Unregistering old mute keybind: "${keybind}"`);

    // If we introduce more keybinds (like deafen) we should have a separate store on the main process that stores the Accelerator cmd and unregister it individualy
    // globalShortcut.unregister(oldKeybind.join('+'));

    globalShortcut.unregisterAll();
  }

  const mainWindow = getMainWindow();

  if (!mainWindow) {
    throw Error('Window is undefined');
  }

  if (newKeybind && newKeybind.length > 0) {
    const keybind = newKeybind.map(normalizeKey).join('+');

    console.log(`Registering new mute keybind: "${keybind}"`);

    globalShortcut.register(keybind, () => {
      console.log('Toggling mic state from the main process');
      mainWindow.webContents.send('toggle-mute-microphone');
    });
  }
}

function normalizeKey(key: KeyCodeEvent): string | undefined {
  console.log(`normalized: ${key?.electronKey}`);
  return key?.electronKey;
}
