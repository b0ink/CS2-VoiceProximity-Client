import { app, shell, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { SteamAuth } from './SteamAuth';
import Store from 'electron-store';
import windowStateKeeper from 'electron-window-state';
// import { initialiseIpcHandlers } from './ipc-handler';
import './ipc-handlers';

const appProtocolClient = `cs2-proximity-chat`;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

interface StoreData {
  steamId: string;
}

const auth = new SteamAuth();

const store = new Store<StoreData>();
let mainWindow: BrowserWindow;

function createWindow(): void {
  const mainWindowState = windowStateKeeper({});

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 350,
    height: 500,
    show: false,
    resizable: false,
    autoHideMenuBar: false,
    alwaysOnTop: true,
    // frame: false,
    fullscreenable: false,
    x: mainWindowState.x,
    y: mainWindowState.y,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    },
  });

  mainWindowState.manage(mainWindow);

  mainWindow.on('ready-to-show', () => {
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
    app.setAsDefaultProtocolClient(appProtocolClient, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(appProtocolClient);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    const launchUrl = `${commandLine?.pop()?.slice(0, -1)}`;
    console.log(`Client has arrived from ${launchUrl}`);

    if (!launchUrl.startsWith(appProtocolClient)) {
      return;
    }

    console.log(`Verifying steam authentication...`);
    const openIdResponse = auth.parseOpenIdResponse(launchUrl);
    console.log(openIdResponse);
    // TODO: forward openIdResponse to our api and validate the payload with the sig against steam's openid api, then return our own signed JWT
    const steamIdUrl = openIdResponse.identity;
    const sig = openIdResponse.sig;

    // TODO: everything should be done in the SteamAuth class (when we have our shareable store modules)

    if (!steamIdUrl || !sig) {
      return console.log(`Invalid openid payload`);
    }
    const steamId64 = steamIdUrl.split('.com/openid/id/')[1]; // TODO: we could install the steamid npm package to validate its a valid steamid64
    if (steamId64) {
      store.set('steamId', steamId64);
      console.log(`Setting steamid ${steamId64}`);
    }
  });

  // Create mainWindow, load the rest of the app, etc...
  app.whenReady().then(() => {
    createWindow();
  });
}

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
    session.fromPartition('default').setPermissionRequestHandler((_webContents, permission, callback) => {
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

  // checkSteamAuthentication();
});

const checkSteamAuthentication = () => {
  const steamId = store.get('steamId');
  console.log(`Checking steam authentication: ${steamId}`);

  if (!steamId) {
    console.log('No steam id has been found, requesting sign in...');
    // TODO: in the future we will be storing a JWT token instead of the steamId
    // TODO: If the JWT token fails to validate (expiration + signature, etc.) we will request sign in again
    getSteamId();
  }
};

ipcMain.handle('reload-app', async () => {
  //TODO: signing out should not prompt the browser until user clicks sign in again
  mainWindow.reload();
  checkSteamAuthentication();
});

async function getSteamId() {
  auth.openSteamAuthenticationWindow().then().catch(console.log);
  // auth
  //   .authenticate()
  //   .then((token) => {
  //     // use your token.steam_id
  //     console.log(`WE GOT YOUR STEAM ID: ${token}`);
  //     if (token) {
  //       store.set('steamId', token);
  //     }
  //   })
  //   .catch((error) => {
  //     //TODO: throw error saying could not authenticate through Steam.
  //     console.error(`SteamAuth error :( -> ${error}`);
  //   });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
