// Shared by the main process (which enforces it) and the settings form (for immediate feedback).

export const SERVER_URL_HINT = 'Enter an https:// address, e.g. https://voice.example.com';

// Must match the http:// hosts the renderer's Content-Security-Policy allows in connect-src
// (src/renderer/index.html). CSP can't express IPv6 hosts, so [::1] isn't allowed.
function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Returns the server's origin (e.g. "https://voice.example.com"), or null if the URL isn't allowed.
 *
 * The app sends the login token and TURN credentials to this server, so it must be https. Plain
 * http is only allowed for a server on this machine (local development). Paths, query strings and
 * credentials are rejected: the API and socket connection both live at the server's root.
 */
export function normalizeServerUrl(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const allowedScheme =
    url.protocol === 'https:' || (url.protocol === 'http:' && isLoopbackHost(url.hostname));
  const isBareAddress = (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
  if (!allowedScheme || !isBareAddress || url.username || url.password) {
    return null;
  }

  return url.origin;
}
