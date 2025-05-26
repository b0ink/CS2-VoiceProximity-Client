import { writable } from 'svelte/store';
import { DEFAULT_STORE, type StoreData } from '@shared/types/store/default';

const store = writable<StoreData>(DEFAULT_STORE);

window.api.getStore().then((data) => {
  console.log(`Renderer: getStore() => ${JSON.stringify(data)}`);
  store.set(data);
});

window.api.onStoreUpdate(({ key, newValue }) => {
  console.log(`Renderer: onStoreUpdate() => ${String(key)} ${newValue}`);
  store.update((s) => ({ ...s, [key]: newValue }));
});

export default store;
