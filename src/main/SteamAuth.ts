import { app, BrowserWindow, BrowserWindowConstructorOptions, Event, shell } from 'electron';
import openid from 'openid';
import nodeUrl from 'url';

interface SteamOpenIDParams {
  ns?: string;
  mode?: string;
  op_endpoint?: string;
  claimed_id?: string;
  identity?: string;
  return_to?: string;
  response_nonce?: string;
  assoc_handle?: string;
  signed?: string;
  sig?: string;
}

const realm = !app.isPackaged
  ? 'http://localhost:3000/'
  : `https://cs2-proximitychat-server.onrender.com/`;
const return_url = `${realm}verify-steam`;

const USE_EXTERNAL_BROWSER = true;

export class SteamAuth {
  private windowParams: BrowserWindowConstructorOptions;
  constructor(windowParams: BrowserWindowConstructorOptions = {}) {
    this.windowParams = {
      alwaysOnTop: true,
      autoHideMenuBar: false,
      skipTaskbar: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      ...windowParams,
    };
  }

  parseOpenIdResponse(openIdResponse: string) {
    const url = new URL(openIdResponse);
    const token = url.searchParams.get('token') || undefined;
    return token;
  }

  openSteamAuthenticationWindow() {
    const rely = new openid.RelyingParty(
      return_url,
      realm,
      //   'http://localhost:3000/verify-steam',
      //   'http://localhost:3000/', // Realm (specifies realm for OpenID authentication)

      true, // Use stateless verification
      false, // Strict mode
      [], // List of extensions to enable and include
    );

    return new Promise((resolve, reject) => {
      rely.authenticate('http://steamcommunity.com/openid', false, (error, providerUrl) => {
        if (error) {
          reject(new Error(error));
        }

        if (USE_EXTERNAL_BROWSER) {
          shell.openExternal(providerUrl);
          reject('Waiting for browser...');
          return;
        }

        resolve('');
      });
    });
  }
}
