import { shell } from 'electron';
import jwt from 'jsonwebtoken';
import openid from 'openid';
import { DEFAULT_SOCKET_SERVER } from '../shared/constants';
import { retrieveTurnCredentials } from './retrieveTurnCredentials';
import { settingsStore, store } from './store';

const USE_EXTERNAL_BROWSER = true;

interface JwtAuthPayload {
  steamId?: string;
  exp?: number;
  iat?: number;
  aud?: string;
}

export class SteamAuth {
  async validateJwtToken(): Promise<void> {
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

  authenticate = (launchUrl): void => {
    console.log(`Verifying steam authentication...`);
    const token = this.parseOpenIdResponse(launchUrl);
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
    this.validateJwtToken();
  };

  parseOpenIdResponse(openIdResponse: string): string | undefined {
    const url = new URL(openIdResponse);
    const token = url.searchParams.get('token') || undefined;
    return token;
  }

  async openSteamAuthenticationWindow(): Promise<void> {
    const defaultRealm = DEFAULT_SOCKET_SERVER;

    if (!(await settingsStore.get('socketServer'))) {
      settingsStore.set('socketServer', defaultRealm);
    }

    const realm = await settingsStore.get('socketServer');
    const returnUrl = `${realm}/verify-steam`;

    console.log('realm', realm);
    console.log('return1', returnUrl);

    const rely = new openid.RelyingParty(
      returnUrl,
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

        resolve();
      });
    });
  }
}
