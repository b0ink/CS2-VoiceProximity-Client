import Store from 'electron-store';
import { StoreData } from './types';

const store = new Store<StoreData>();

export async function getApiUrl() {
  return (await store.get('socketServer')) || 'https://cs2voiceproximity.chat';
}
