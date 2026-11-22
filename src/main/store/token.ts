import { safeStorage } from 'electron';
import Store from 'electron-store';
import { getMainWindow } from '../main-window';

// The login token, encrypted at rest with safeStorage (DPAPI on Windows) so it's never written to
// disk in plain text. It lives in its own file, not clientStore.json. The renderer still sees it as
// the `token` key of the client store (store:get / store:update), and changes it via set-store-value.
const authStore = new Store<{ encryptedToken: string | null }>({
  name: 'auth',
  defaults: { encryptedToken: null },
});

let token: string | null = null;
let saving: Promise<void> = Promise.resolve();

/** Decrypts the saved token. Call once when the app is ready, before creating the window. */
export async function loadToken(): Promise<void> {
  const encrypted = authStore.get('encryptedToken');
  if (!encrypted) {
    return;
  }
  try {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      console.warn('OS encryption is unavailable, so the saved login token cannot be read');
      return;
    }
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(
      Buffer.from(encrypted, 'base64'),
    );
    token = result;
    if (shouldReEncrypt) {
      save(result); // the OS key changed
    }
  } catch (error) {
    // e.g. the file was copied from another Windows user or machine
    console.warn('Could not decrypt the saved login token; signing in again is required', error);
    authStore.set('encryptedToken', null);
  }
}

export function getToken(): string | null {
  return token;
}

export function setToken(value: unknown): void {
  token = typeof value === 'string' && value ? value : null;
  save(token);
  getMainWindow()?.webContents.send('store:update', { key: 'token', newValue: token });
}

// Saves run one at a time, in order, so the latest setToken always ends up on disk.
function save(value: string | null): void {
  saving = saving
    .then(async () => {
      if (value === null || !(await safeStorage.isAsyncEncryptionAvailable())) {
        // Logged out, or no OS encryption: keep nothing on disk (sign in again next launch).
        authStore.set('encryptedToken', null);
        return;
      }
      const encrypted = await safeStorage.encryptStringAsync(value);
      authStore.set('encryptedToken', encrypted.toString('base64'));
    })
    .catch((error) => {
      console.error('Failed to save the login token', error);
      authStore.set('encryptedToken', null);
    });
}
