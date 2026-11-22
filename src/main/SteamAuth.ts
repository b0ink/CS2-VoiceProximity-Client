import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import openid from 'openid';
import { retrieveIceServers } from './retrieveIceServers';
import { openExternalSafely } from './security';
import defaultStore from './store/default';
import settingsStore from './store/settings';
import { getToken, setToken } from './store/token';

const USE_EXTERNAL_BROWSER = true;

// Steam's OpenID identifier. This lookup decides which page we open in the user's browser, so it
// must be https: over plain http, anyone on the network could swap in their own page.
const STEAM_OPENID_IDENTIFIER = 'https://steamcommunity.com/openid';
// The only login page we'll open (what Steam's lookup returns, ignoring the query string).
const STEAM_OPENID_LOGIN_URL = 'https://steamcommunity.com/openid/login';

// How long a login started from this app stays valid while the user signs in to Steam.
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

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
  // One-time login codes ("state") for logins started from this app, mapped to when they started.
  // The code goes to the server inside Steam's signed return_to and comes back in the
  // cs2-proximity-chat:// link. Links without a matching code are ignored, so a website can't
  // log the app into someone else's account just by opening a link.
  private pendingLogins = new Map<string, number>();

  async validateJwtToken(): Promise<void> {
    const steamId = defaultStore.get('steamId');
    const token = getToken();
    if (!token || !steamId || typeof token !== 'string' || typeof steamId !== 'string') {
      defaultStore.set('steamId', null);
      setToken(null);
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
        setToken(null);
      }
    }
  }

  authenticate = (launchUrl: string): void => {
    console.log(`Verifying steam authentication...`);
    const callback = this.parseLoginCallback(launchUrl);
    if (!callback) {
      return console.log('Ignored a login link without a token and login code.');
    }
    if (!this.finishLogin(callback.state)) {
      return console.log('Ignored a login link that this app did not start, or that expired.');
    }

    const { token } = callback;
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
    setToken(token);
    defaultStore.set('steamId', steamId64);
    console.log(`Setting token ${token}`);
    console.log(`Setting steamid ${steamId64}`);

    // validate again and fetch turn credentials
    this.validateJwtToken();
  };

  private parseLoginCallback(launchUrl: string): { token: string; state: string } | null {
    try {
      const url = new URL(launchUrl);
      const token = url.searchParams.get('token');
      const state = url.searchParams.get('state');
      return token && state ? { token, state } : null;
    } catch {
      return null; // malformed link
    }
  }

  private startLogin(): string {
    this.prunePendingLogins();
    const state = randomBytes(32).toString('base64url');
    this.pendingLogins.set(state, Date.now());
    return state;
  }

  /** Consumes a pending login. Any accepted link ends every pending attempt. */
  private finishLogin(state: string): boolean {
    this.prunePendingLogins();
    if (!this.pendingLogins.has(state)) {
      return false;
    }
    this.pendingLogins.clear();
    return true;
  }

  private prunePendingLogins(): void {
    const cutoff = Date.now() - LOGIN_TIMEOUT_MS;
    for (const [state, startedAt] of this.pendingLogins) {
      if (startedAt < cutoff) {
        this.pendingLogins.delete(state);
      }
    }
  }

  async openSteamAuthenticationWindow(): Promise<void> {
    const realm = await settingsStore.get('socketServer');
    if (realm === null) {
      throw new Error('Region has not been set.');
    }

    // Requires a server that echoes `state` back in the login link (see verify-steam.ts).
    const returnUrl = `${realm}/verify-steam?state=${this.startLogin()}`;

    console.log('realm', realm);

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
