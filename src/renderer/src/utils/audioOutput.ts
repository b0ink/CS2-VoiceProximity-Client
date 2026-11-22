// Sends app audio to the output device chosen in settings.
//
// Voices and reverb all play through the Three.js listener's AudioContext, so setting that context's
// sink moves them together; UI sounds and the mic test each need their own call.

// AudioContext.setSinkId is supported by Chromium but not yet in TypeScript's DOM types.
interface AudioSink {
  setSinkId?: (sinkId: string) => Promise<void>;
}

/** The sinkId for a saved output device: '' means the system default. */
function sinkIdFor(outputDeviceId: string | null): string {
  return !outputDeviceId || outputDeviceId === 'default' ? '' : outputDeviceId;
}

/**
 * Plays `target` on the chosen output device. If the device is gone (e.g. a headset was unplugged),
 * it stays on whatever it was playing to, so audio keeps working.
 */
export async function applyOutputDevice(
  target: AudioContext | HTMLMediaElement,
  outputDeviceId: string | null,
): Promise<void> {
  const sink = target as AudioSink;
  if (typeof sink.setSinkId !== 'function') {
    return;
  }
  try {
    await sink.setSinkId(sinkIdFor(outputDeviceId));
  } catch (error) {
    console.warn('Could not switch to the chosen output device', error);
  }
}
