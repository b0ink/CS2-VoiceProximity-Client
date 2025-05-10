import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import Store from 'electron-store';
import windowStateKeeper from 'electron-window-state';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { join } from 'path';
import icon from '../../resources/icon.png?asset';
import { setMainWindow } from './ipc-handlers';
import { retrieveTurnCredentials } from './retrieveTurnCredentials';
import { SteamAuth } from './SteamAuth';
import { JwtAuthPayload, StoreData } from './types';

const appProtocolClient = `cs2-proximity-chat`;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const auth = new SteamAuth();

const store = new Store<StoreData>();

let mainWindow: BrowserWindow;

async function validateJwtToken() {
  const steamId = store.get('steamId');
  const token = store.get('token');
  if (!token || !steamId || typeof token !== 'string' || typeof steamId !== 'string') {
    store.set('steamId', null);
    store.set('token', null);
  } else {
    try {
      const payload = jwt.decode(token) as JwtAuthPayload | null;
      if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token is invalid, expired, or missing expiration');
      }
      // Token is valid
      await retrieveTurnCredentials();
    } catch (e) {
      console.log(e);
      // Reset token
      store.set('steamId', null);
      store.set('token', null);
    }
  }
}

function createWindow(): void {
  const mainWindowState = windowStateKeeper({});

  const alwaysOnTop = store.get('setting_alwaysOnTop', true);

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 350,
    height: 500,
    show: false,
    resizable: false,
    autoHideMenuBar: false,
    alwaysOnTop: alwaysOnTop,
    // frame: false,
    fullscreenable: false,
    minimizable: false,
    x: mainWindowState.x,
    y: mainWindowState.y,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      backgroundThrottling: false,
    },
  });

  setMainWindow(mainWindow);

  mainWindow.on('closed', () => {
    try {
      mainWindow?.destroy();
      // If we open any other windows we need to destroy them here
    } catch {
      /* empty */
    }
  });

  mainWindowState.manage(mainWindow);

  mainWindow.on('ready-to-show', () => {
    // Reset token and steamid if invalid or expired token
    validateJwtToken();
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(appProtocolClient, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(appProtocolClient);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // console.log(commandLine);

    // Removes leading/trailing double quotes and trims whitespace
    const launchUrl = commandLine?.pop()?.replace(/^"|"$/g, '').trim();

    console.log(`Client has arrived from ${launchUrl}`);
    if (!launchUrl || !launchUrl.startsWith(appProtocolClient)) {
      return;
    }

    Authenticate(launchUrl);
    // TODO: everything should be done in the SteamAuth class (when we have our shareable store modules)
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // IPC test
    ipcMain.on('ping', () => console.log('pong'));

    createWindow();

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      session
        .fromPartition('default')
        .setPermissionRequestHandler((_webContents, permission, callback) => {
          const allowedPermissions = ['audioCapture']; // Full list here: https://developer.chrome.com/extensions/declare_permissions#manifest
          console.log('permission requested ', permission);
          if (allowedPermissions.includes(permission)) {
            callback(true); // Approve permission request
          } else {
            console.error(
              `The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`,
            );

            callback(false); // Deny
          }
        });
    });

    app.on('open-url', (_, url) => {
      Authenticate(url);
    });
  });
}

const Authenticate = (launchUrl) => {
  console.log(`Verifying steam authentication...`);
  const token = auth.parseOpenIdResponse(launchUrl);
  // console.log(token);
  if (!token) {
    return console.log('Invalid or no token returned.');
  }

  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || 'steamid' in decoded) {
    return console.log('Invalid token');
  }
  const payload = decoded as JwtAuthPayload;
  const steamId64 = payload.steamId;
  if (!steamId64) {
    return console.log('Invalid steamid64');
  }

  store.set('token', token);
  store.set('steamId', steamId64);
  console.log(`Setting token ${token}`);
  console.log(`Setting steamid ${steamId64}`);

  // validate again and fetch turn credentials
  validateJwtToken();
};

const checkSteamAuthentication = () => {
  const steamId = store.get('steamId');
  console.log(`Checking steam authentication: ${steamId}`);

  if (!steamId) {
    console.log('No steam id has been found, requesting sign in...');
    getSteamId();
  }
};

ipcMain.handle('reload-app', async () => {
  mainWindow.reload();
});

ipcMain.handle('prompt-steam-authentication', async () => {
  checkSteamAuthentication();
});

async function getSteamId() {
  auth.openSteamAuthenticationWindow().then().catch(console.log);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  mainWindow?.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
