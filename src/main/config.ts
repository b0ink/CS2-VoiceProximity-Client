import Store from 'electron-store';
import { StoreData } from './types';

const store = new Store<StoreData>();

export function getApiUrl() {
  return store.get('socketServer') || 'https://cs2voiceproximity.chat';
}
