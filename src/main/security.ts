import { app, session, shell } from 'electron';

/** True if `target` is the app's own page (`ownPage` is the URL the renderer is loaded from). */
function isOwnPage(target: string | undefined, ownPage: URL): boolean {
  if (!target) {
    return false;
  }
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
}

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

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event) => {
      if (!isOwnPage(event.url, ownPage)) {
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

/**
 * Grants the app's own page microphone access and audio output selection, and denies every other
 * browser permission (camera, screen capture, location, notifications, USB/HID/serial, ...).
 * Without a handler, Electron grants everything. Must be called after the app is ready.
 *
 * @param rendererUrl The URL the app's page is loaded from.
 */
export function restrictPermissions(rendererUrl: string): void {
  const ownPage = new URL(rendererUrl);

  // Requests, e.g. getUserMedia(). Only audio-only capture and choosing the output device.
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const isAudioOnlyCapture =
        permission === 'media' &&
        'mediaTypes' in details &&
        !!details.mediaTypes?.length &&
        details.mediaTypes.every((type) => type === 'audio');
      const allowed =
        (isAudioOnlyCapture || permission === 'speaker-selection') &&
        isOwnPage(details.requestingUrl, ownPage);

      if (!allowed) {
        console.warn(`Denied the "${permission}" permission request`);
      }
      callback(allowed);
    },
  );

  // Checks, e.g. whether enumerateDevices() may show device names (the settings device lists), or
  // whether audio may be sent to a chosen output device.
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, _requestingOrigin, details) =>
      ((permission === 'media' && details.mediaType !== 'video') ||
        permission === 'speaker-selection') &&
      isOwnPage(details.requestingUrl, ownPage),
  );
}
