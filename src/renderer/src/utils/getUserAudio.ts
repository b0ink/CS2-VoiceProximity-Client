import { get } from 'svelte/store';
import { NoiseSuppressionProcessor } from '@shiguredo/noise-suppression';
import settings from '@store/settings';

interface UserAudio {
  stream: MediaStream;
  noiseSupressionEnabled: boolean;
}
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
    echoCancellation: false,
    // @ts-ignore - non-standard constraint
    latency: 0,
    noiseSuppression: noiseSuppression,
    // @ts-ignore - non-standard constraint used by chrome
    googNoiseSuppression: noiseSuppression,
    googNoiseSupression: noiseSuppression,
    // @ts-ignore - non-standard constraint used by chrome
    googEchoCancellation: echoCancellation,
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

  // const assetsPath = 'https://cdn.jsdelivr.net/npm/@shiguredo/noise-suppression@latest/dist';
  const processor = new NoiseSuppressionProcessor('rnnoise');

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

    return {
      stream,
      noiseSupressionEnabled,
    };
  } catch (e) {
    console.error(`Failed to get user media: ${e}`);
    return null;
  }
};
