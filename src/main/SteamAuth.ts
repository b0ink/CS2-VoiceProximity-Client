import { shell } from 'electron';
import openid from 'openid';
import { getApiUrl } from './config';

const USE_EXTERNAL_BROWSER = true;

export class SteamAuth {
  parseOpenIdResponse(openIdResponse: string): string | undefined {
    const url = new URL(openIdResponse);
    const token = url.searchParams.get('token') || undefined;
    return token;
  }

  async openSteamAuthenticationWindow(): Promise<void> {
    const realm = await getApiUrl();
    const returnUrl = `${realm}/verify-steam`;

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
