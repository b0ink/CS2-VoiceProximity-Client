import { IceServer } from '@shared/types/api';
import defaultStore from './store/default';
import settingsStore from './store/settings';

interface IceServerConfig {
  forceRelayOnly: boolean;
  iceServers: IceServer[];
}

export async function retrieveIceServers(): Promise<IceServer[] | null> {
  const token = defaultStore.get('token');
  if (!token) {
    return null;
  }

  const apiUrl = settingsStore.get('socketServer');
  const iceServers: IceServer[] = [];

  try {
    const response = await fetch(`${apiUrl}/get-ice-servers`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const statusCode = response.status;
    if (statusCode === 401) {
      console.log('Token must be invalid, user must authenticate');
      defaultStore.set('token', null);
      defaultStore.set('steamId', null);
      return null;
    } else if (statusCode === 200) {
      const data: { message: string; data: IceServerConfig } = await response.json();
      const forceRelayOnly = data.data.forceRelayOnly;

      iceServers.push(...data.data.iceServers);

      if (forceRelayOnly) {
        settingsStore.set('natFixEnabled', true);
      }

      defaultStore.set('forceRelayOnly', forceRelayOnly);
    } else {
      throw Error(`Failed to fetch credentials`);
    }
  } catch (e) {
    console.error(e);
    iceServers.push({
      type: 'STUN',
      uri: 'stun:stun.l.google.com:19302',
    });
  }

  // if (!iceServers.some((s) => s.type === 'TURN')) {
  //   settingsStore.set('natFixEnabled', false);
  // } else if
  if (!iceServers.some((s) => s.type === 'STUN')) {
    settingsStore.set('natFixEnabled', true);
  }

  defaultStore.set('iceServers', iceServers);
  return iceServers;
}
