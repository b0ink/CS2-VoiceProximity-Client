import jwt from 'jsonwebtoken';
import openid from 'openid';
import { retrieveIceServers } from './retrieveIceServers';
import { openExternalSafely } from './security';
import defaultStore from './store/default';
import settingsStore from './store/settings';

const USE_EXTERNAL_BROWSER = true;

// Steam's OpenID identifier. This lookup decides which page we open in the user's browser, so it
// must be https: over plain http, anyone on the network could swap in their own page.
const STEAM_OPENID_IDENTIFIER = 'https://steamcommunity.com/openid';
// The only login page we'll open (what Steam's lookup returns, ignoring the query string).
const STEAM_OPENID_LOGIN_URL = 'https://steamcommunity.com/openid/login';

function isSteamLoginUrl(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}` === STEAM_OPENID_LOGIN_URL;
  } catch {
    return false;
  }
}

interface JwtAuthPayload {
  steamId?: string;
  exp?: number;
  iat?: number;
  aud?: string;
}

export class SteamAuth {
  async validateJwtToken(): Promise<void> {
    const steamId = defaultStore.get('steamId');
    const token = defaultStore.get('token');
    if (!token || !steamId || typeof token !== 'string' || typeof steamId !== 'string') {
      defaultStore.set('steamId', null);
      defaultStore.set('token', null);
    } else {
      try {
        const payload = jwt.decode(token) as JwtAuthPayload | null;
        const TOKEN_REAUTH_THRESHOLD = 6 * 60 * 60; // Require re-auth if token expires within 6 hours
        if (
          !payload ||
          !payload.exp ||
          payload.exp < Math.floor(Date.now() / 1000) + TOKEN_REAUTH_THRESHOLD
        ) {
          throw new Error('Token is invalid, expired, or missing expiration');
        }
        // Token is valid
        await retrieveIceServers();
      } catch (e) {
        console.log(e);
        // Reset token
        defaultStore.set('steamId', null);
        defaultStore.set('token', null);
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

    defaultStore.set('iceServers', null);
    defaultStore.set('token', token);
    defaultStore.set('steamId', steamId64);
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
    const realm = await settingsStore.get('socketServer');

    const returnUrl = `${realm}/verify-steam`;

    console.log('realm', realm);
    console.log('return1', returnUrl);

    return new Promise((resolve, reject) => {
      const rely = new openid.RelyingParty(
        returnUrl,
        realm,
        //   'http://localhost:3000/verify-steam',
        //   'http://localhost:3000/', // Realm (specifies realm for OpenID authentication)

        true, // Use stateless verification
        false, // Strict mode
        [], // List of extensions to enable and include
      );

      if (realm === null) {
        reject(new Error('Region has not been set.'));
        return;
      }
      rely.authenticate(STEAM_OPENID_IDENTIFIER, false, (error, providerUrl) => {
        if (error) {
          reject(new Error(error));
          return;
        }

        if (!isSteamLoginUrl(providerUrl)) {
          reject(new Error('Steam returned an unexpected login URL'));
          return;
        }

        if (USE_EXTERNAL_BROWSER) {
          openExternalSafely(providerUrl);
          reject('Waiting for browser...');
          return;
        }

        resolve();
      });
    });
  }
}
