import { BrowserWindow } from 'electron';
import windowStateKeeper from 'electron-window-state';
import { join } from 'path';
import { version as appVersion } from '../../package.json';
import icon from '../../resources/icon.png?asset';
import settingsStore from './store/settings';

let mainWindow: BrowserWindow | undefined;

export const initMainWindow = (): BrowserWindow => {
  const mainWindowState = windowStateKeeper({});

  const alwaysOnTop = settingsStore.get('alwaysOnTop', true);

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 350,
    height: 500,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    alwaysOnTop: alwaysOnTop,
    frame: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    x: mainWindowState.x,
    y: mainWindowState.y,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // The renderer handles untrusted data (socket server, peers, player names), so it must
      // never get Node access. Everything it needs goes through the preload's `window.api`.
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      backgroundThrottling: false,
    },
  });

  // https://github.com/electron/electron/issues/20933
  mainWindow.setAlwaysOnTop(alwaysOnTop, 'normal');

  mainWindow.webContents.userAgent = `CS2VoiceProximity/${appVersion}`;
  return mainWindow;
};

export const getMainWindow = (): BrowserWindow | undefined => {
  return mainWindow;
};
