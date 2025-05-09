import { DefaultNotificationOptions } from 'svelte-notifications';

export interface JwtAuthPayload {
  steamId?: string;
  exp?: number;
  iat?: number;
  aud?: string;
}

export interface TurnCredential {
  username: string;
  password: string;
}

export interface StoreData {
  steamId?: string;
  token?: string;
  turnUsername?: string;
  turnPassword?: string;
  socketServer?: string;
  notification?: DefaultNotificationOptions;
  setting_alwaysOnTop?: boolean;
}
