import { settingsStore, store } from './store';

interface TurnCredential {
  username: string;
  password: string;
}

export async function retrieveTurnCredentials(): Promise<TurnCredential | null> {
  const token = store.get('token');
  if (!token) {
    return null;
  }

  const turnUsername = store.get('turnUsername');
  const turnPassword = store.get('turnPassword');

  console.log(turnUsername, turnPassword);
  if (turnUsername && turnPassword && turnUsername.indexOf(':') !== -1) {
    const [expiryStr] = turnUsername.split(':');
    const expiry = parseInt(expiryStr, 10);
    if (!isNaN(expiry) && expiry - 60 > Date.now() / 1000) {
      console.log('Return cached credentials');
      return {
        username: turnUsername,
        password: turnPassword,
      };
    }
  }

  store.delete('turnUsername');
  store.delete('turnPassword');
  const apiUrl = settingsStore.get('socketServer');
  try {
    const response = await fetch(`${apiUrl}/get-turn-credential`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const statusCode = response.status;
    if (statusCode === 401) {
      console.log('Token must be invalid, user must authenticate');
      store.set('token', null);
      store.set('steamId', null);
      return null;
    }
    if (statusCode === 200) {
      const data: { message: string; data: TurnCredential } = await response.json();
      const credential = data.data;
      store.set('turnUsername', credential.username);
      store.set('turnPassword', credential.password);
      console.log(`Received turn credentials: ${JSON.stringify(credential)}`);

      return {
        username: credential.username,
        password: credential.password,
      };
    }
    throw Error(`Failed to fetch credentials`);
  } catch (e) {
    console.error(e);
    return null;
  }
}
