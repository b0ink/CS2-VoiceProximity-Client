import { BrowserWindow, BrowserWindowConstructorOptions, Event } from 'electron';
import openid from 'openid';
import nodeUrl from 'url';

// interface SteamOpenIDPayload {
//   'openid.ns': string;
//   'openid.mode': string;
//   'openid.op_endpoint': string;
//   'openid.claimed_id': string;
//   'openid.identity': string;
//   'openid.return_to': string;
//   'openid.response_nonce': string;
//   'openid.assoc_handle': string;
//   'openid.signed': string;
//   'openid.sig': string;
// }

// TODO: We can use this later to validate steamIds
// This should be done from the API;
// When we retrieve the openid payload (identity + sig), we forward that to the API
// The API will validate the steam auth payload, and it will return a signed JWT containing the steamid
// The JWT will be stored client side, and we can ensure this steamid actually belongs to the client
// async function validateSteamAuth(payload: SteamOpenIDPayload): Promise<boolean> {
//   const params = new URLSearchParams({
//     ...payload,
//     'openid.mode': 'check_authentication',
//   });

//   const response = await fetch('https://steamcommunity.com/openid/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: params.toString(),
//   });

//   const text = await response.text();
//   return text.includes('is_valid:true');
// }

// Another complicated alternative would be to create an actual authentication site that uses openid with steam
// If we're going to have the API to validate the steam ids, we might as well do it via a website
// the user can manually paste in the JWT or something like that

const return_url = 'http://localhost:5173';
export class SteamAuth {
  private windowParams: BrowserWindowConstructorOptions;
  constructor(windowParams: BrowserWindowConstructorOptions) {
    this.windowParams = windowParams;
  }

  authenticate() {
    // TODO: dynamically use window.location.origin for the return to url
    const rely = new openid.RelyingParty(
      return_url,
      return_url,

      // 'http://CS2-Voice-Proximity/verify-steam',
      // 'http://CS2-Voice-Proximity/',

      //   'http://localhost:3000/verify-steam',
      //   'http://localhost:3000/', // Realm (specifies realm for OpenID authentication)

      true, // Use stateless verification
      false, // Strict mode
      [], // List of extensions to enable and include
    );

    return new Promise((resolve, reject) => {
      rely.authenticate('http://steamcommunity.com/openid', false, (error, providerUrl) => {
        const authWindow = new BrowserWindow(this.windowParams || { 'use-content-size': true });
        authWindow.loadURL(providerUrl);
        authWindow.show();
        authWindow.setTitle(providerUrl);

        authWindow.on('closed', () => {
          reject(new Error('window was closed by user'));
        });

        function onCallback(url: string) {
          console.log('url:', url);
          authWindow.setTitle(url);

          if (url.indexOf('https://steamcommunity.com') == -1 && url.indexOf(return_url) == -1) {
            setImmediate(function () {
              // Redirect back to login if they try leaving steam entirely
              authWindow.loadURL(providerUrl);
            });
          }

          if (url.indexOf('openid/login') == -1) {
            // reject(new Error('Window was redirected by the user. Please try authenticating again.'));
            // authWindow.removeAllListeners('closed');
            setImmediate(function () {
              // As a developer, i want to restrict the user only onto the login page...
              // But as a user, i'd probably want to sus out the steam page and make sure it's legit before logging in
              // -
              // If user tries to stray away from login page, redirect them
              //   authWindow.close();
              //   authWindow.loadURL(providerUrl);
            });
          }

          const query = nodeUrl.parse(url, true).query;

          if (Object.keys(query).length === 0) {
            return;
          }

          if (query['need_password'] && query['need_password'] == '1') {
            return;
          }

          if (query['openid.identity'] === undefined) {
            // ! this will get called if its still initialising.. lets just ignore it

            // reject(new Error('cannot authenticate through Steam'));
            // authWindow.removeAllListeners('closed');
            setImmediate(function () {
              //   authWindow.close();
            });
          } else {
            // resolve({
            //   response_nonce: query['openid.response_nonce'],
            //   assoc_handle: query['openid.assoc_handle'],
            //   identity: query['openid.identity'],
            //   steam_id: query['openid.identity'].match(/\/id\/(.*$)/)[1],
            //   sig: query['openid.sig'],
            // });
            if (Array.isArray(query['openid.identity'])) {
              return;
            }

            const steamId = query['openid.identity'].split('.com/openid/id/')[1];

            if (steamId === undefined) {
              // This is super hacky...
              // because if we sign in for the first time, we can't quite get the steamId yet
              // But if we're prompted with our username/account already logged in and just need to "Sign In", then we can retrieve the steam id
              // So this will refresh the page, requiring the user to click sign in again
              authWindow.loadURL(providerUrl);
              return;
            }

            resolve(steamId);
            console.log(query);
            authWindow.removeAllListeners('closed');
            setImmediate(function () {
              authWindow.close();
            });
          }
        }

        authWindow.webContents.on('will-navigate', (details: Event) => {
          authWindow.setTitle(details['url']);
          onCallback(details['url']);
        });

        authWindow.webContents.on('did-redirect-navigation', (details: Event) => {
          authWindow.setTitle(details['url']);
          onCallback(details['url']);
        });
      });
    });
  }
}
