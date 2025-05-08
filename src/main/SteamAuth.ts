import { shell } from 'electron';
import openid from 'openid';
import { getApiUrl } from './config';

const realm = getApiUrl();
const return_url = `${realm}/verify-steam`;

const USE_EXTERNAL_BROWSER = true;

export class SteamAuth {
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
