import { writable } from 'svelte/store';
import type { StoreData } from '../../../shared/types/store';

const store = writable<StoreData>({
  steamId: null,
  token: null,
  turnUsername: null,
  turnPassword: null,
  notification: null,
  savedRoomCode: null,
});

window.api.getStore().then((data) => {
  console.log(`Renderer: getStore() => ${JSON.stringify(data)}`);
  store.set(data);
});

window.api.onStoreUpdate(({ key, newValue }) => {
  console.log(`Renderer: onStoreUpdate() => ${String(key)} ${newValue}`);
  store.update((s) => ({ ...s, [key]: newValue }));
});

export default store;
