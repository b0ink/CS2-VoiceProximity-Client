import { app, shell } from 'electron';

/**
 * Opens a URL in the user's default browser, but only for https: links.
 *
 * shell.openExternal hands the URL to the OS, so other schemes (file:, or protocol handlers
 * such as search-ms: or ms-msdt:) can open local files or launch programs on Windows.
 */
export function openExternalSafely(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn('Blocked opening an invalid external URL');
    return;
  }

  if (parsed.protocol !== 'https:') {
    console.warn(`Blocked opening an external URL with the "${parsed.protocol}" scheme`);
    return;
  }

  shell.openExternal(parsed.href).catch((error) => {
    console.error('Failed to open external URL', error);
  });
}

/**
 * Stops every window from leaving the app's own page and from opening new Electron windows.
 * `window.open` links go to the user's browser instead (https only).
 *
 * @param rendererUrl The URL the app's page is loaded from (the dev server in development,
 *   the bundled index.html file in production).
 */
export function restrictNavigation(rendererUrl: string): void {
  const ownPage = new URL(rendererUrl);

  const isOwnPage = (target: string): boolean => {
    try {
      const url = new URL(target);
      if (ownPage.protocol === 'file:') {
        // file: URLs have no real origin, so compare the exact file instead.
        return url.protocol === 'file:' && url.pathname === ownPage.pathname;
      }
      return url.origin === ownPage.origin;
    } catch {
      return false;
    }
  };

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event) => {
      if (!isOwnPage(event.url)) {
        event.preventDefault();
        console.warn('Blocked the window from navigating away from the app');
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      openExternalSafely(url);
      return { action: 'deny' };
    });
  });
}
