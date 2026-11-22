import { get } from 'svelte/store';
import type { SettingsData } from '@shared/types/store/settings';
import { NoiseSuppressionProcessor } from '@shiguredo/noise-suppression';
import settings from '@store/settings';

export interface UserAudio {
  stream: MediaStream;
  noiseSupressionEnabled: boolean;
  /** captureSettingsKey() of the settings this was captured with. */
  settingsKey: string;
  /** Releases the microphone and stops noise suppression. */
  stop: () => void;
}

/**
 * The settings that change how the mic is captured. When this changes, the mic needs to be
 * captured again (see App.svelte's swapMicrophone and the mic test).
 */
export const captureSettingsKey = (s: SettingsData): string =>
  JSON.stringify([s.inputDeviceId, s.hqVoice, s.noiseSuppression, s.echoCancellation]);

export const getUserAudio = async (
  audioOptions?: MediaTrackConstraintSet,
): Promise<UserAudio | null> => {
  const currentSettings = get(settings);
  const selectedDeviceId = currentSettings.inputDeviceId;
  const broadcastHqVoice = currentSettings.hqVoice;
  const noiseSuppression = currentSettings.noiseSuppression;
  const echoCancellation = currentSettings.echoCancellation;

  console.log(`Getting user audio:`);
  console.log(currentSettings);

  const audio: MediaTrackConstraintSet = {
    autoGainControl: false,
    channelCount: 1,
    echoCancellation: echoCancellation,
    // @ts-ignore - non-standard constraint
    latency: 0,
    noiseSuppression: noiseSuppression,
    // @ts-ignore - non-standard constraint used by chrome
    googNoiseSuppression: noiseSuppression,
    googNoiseSupression: noiseSuppression,
    // @ts-ignore - non-standard constraint used by chrome
    googTypingNoiseDetection: noiseSuppression,
    // @ts-ignore - non-standard constraint used by chrome
    sampleRate: broadcastHqVoice ? 48000 : 16000,
    sampleSize: broadcastHqVoice ? 16 : 8,
    ...audioOptions,
  };

  console.log(`sampleRate: ${audio.sampleRate} | sampleSize: ${audio.sampleSize}`);

  if (selectedDeviceId) {
    audio.deviceId = selectedDeviceId;
  }

  // RNNoise wasm is embedded in the package since 2025.1.0, so no assets path is needed
  const processor = new NoiseSuppressionProcessor();

  let noiseSupressionEnabled: boolean = false;
  try {
    const rawStream = await navigator.mediaDevices.getUserMedia({ video: false, audio });
    let processedTrack: MediaStreamAudioTrack | undefined = undefined;
    if (noiseSuppression) {
      try {
        processedTrack = await processor.startProcessing(rawStream.getAudioTracks()[0]);
        noiseSupressionEnabled = true;
      } catch (e) {
        console.error(`Unable to activate noise suppression: ${e}`);
        noiseSupressionEnabled = false;
      }
    }

    const stream = processedTrack ? new MediaStream([processedTrack]) : rawStream;

    // The tracks captured here. The caller may swap tracks in and out of `stream` later, so stop()
    // must only stop these, not whatever `stream` holds at that point.
    const capturedTracks = [...rawStream.getTracks(), ...(processedTrack ? [processedTrack] : [])];
    const stop = (): void => {
      if (processor.isProcessing()) {
        processor.stopProcessing();
      }
      capturedTracks.forEach((track) => track.stop());
    };

    return {
      stream,
      noiseSupressionEnabled,
      settingsKey: captureSettingsKey(currentSettings),
      stop,
    };
  } catch (e) {
    console.error(`Failed to get user media: ${e}`);
    return null;
  }
};
