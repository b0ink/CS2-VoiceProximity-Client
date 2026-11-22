<script lang="ts">
  import { Button, Progressbar } from 'flowbite-svelte';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import settings from '@store/settings';
  import { applyOutputDevice } from '../utils/audioOutput';
  import { type UserAudio, captureSettingsKey, getUserAudio } from '../utils/getUserAudio';

  let rms: number = 0;
  let playing: boolean = false;

  $: microphoneMuted = $settings.micMuted;
  $: outputDeviceId = $settings.outputDeviceId;
  let originalMuteState: boolean;

  onMount(() => {});

  const minUpdateRate = 50;
  let lastRefreshTime = 0;

  let processor: ScriptProcessorNode | undefined;
  let src: MediaStreamAudioSourceNode | undefined;

  let ctx: AudioContext | undefined;
  let testAudio: UserAudio | null = null;

  // Hear the test on the chosen output, including if it's changed mid-test.
  $: if (ctx) applyOutputDevice(ctx, outputDeviceId);

  const handleProcess = (event: AudioProcessingEvent): void => {
    // limit update frequency
    if (event.timeStamp - lastRefreshTime < minUpdateRate) {
      return;
    }

    // update last refresh time
    lastRefreshTime = event.timeStamp;

    const input = event.inputBuffer.getChannelData(0);
    const total = input.reduce((acc, val) => acc + Math.abs(val), 0);
    rms = Math.min(0.5, Math.sqrt(total / input.length));
  };

  // Captures the mic and plays it back (without touching the mute state).
  const startCapture = async (): Promise<boolean> => {
    const userAudio = await getUserAudio({
      echoCancellation: false,
    });
    if (!userAudio) {
      console.error(`Could not init microphone`);
      return false;
    }
    testAudio = userAudio;

    ctx = new AudioContext();
    await applyOutputDevice(ctx, outputDeviceId);
    processor = ctx.createScriptProcessor(2048, 1, 1);
    processor.connect(ctx.destination);

    src = ctx.createMediaStreamSource(userAudio.stream);
    src.connect(processor);
    processor.addEventListener('audioprocess', handleProcess);

    src.connect(ctx.destination);
    return true;
  };

  // Stops playback and releases the mic (including noise suppression).
  const stopCapture = (): void => {
    processor?.removeEventListener('audioprocess', handleProcess);
    processor?.disconnect();
    src?.disconnect(); // disconnect input
    testAudio?.stop(); // stop mic access
    testAudio = null;
    ctx?.close(); // close AudioContext
    ctx = undefined;
  };

  // Follow mic setting changes (device, HQ voice, noise suppression...) while testing. This is a
  // store subscription rather than `$:`, since restarting the capture updates testAudio.
  const captureIsStale = (): boolean =>
    playing && testAudio !== null && captureSettingsKey(get(settings)) !== testAudio.settingsKey;

  let restarting = false;
  const restartCapture = async (): Promise<void> => {
    if (restarting) {
      return;
    }
    restarting = true;
    try {
      // Repeats if the settings changed again while the mic was being captured.
      while (captureIsStale()) {
        stopCapture();
        await startCapture();
        if (!playing) {
          stopCapture(); // the test was stopped meanwhile: don't leave the mic open
          break;
        }
      }
    } finally {
      restarting = false;
    }
  };

  onDestroy(settings.subscribe(() => restartCapture()));

  const getVoice = async (): Promise<void> => {
    if (!(await startCapture())) {
      return;
    }

    originalMuteState = microphoneMuted;

    if (!microphoneMuted) {
      window.api.toggleMuteMicrophone();
    }

    playing = true;
  };

  const stopVoice = (): void => {
    if (playing) {
      if (originalMuteState !== microphoneMuted) {
        window.api.toggleMuteMicrophone();
      }
      console.log('stopping voice');
    }

    stopCapture();
    playing = false;
  };

  onDestroy(() => {
    stopVoice();
  });

  $: progressValue = rms * 2 * 100;
</script>

<Button
  class="cursor-pointer"
  size="sm"
  color={playing ? 'red' : 'blue'}
  onclick={() => {
    !playing ? getVoice() : stopVoice();
  }}>Test Microphone</Button
>

{#if playing}
  <Progressbar animate progress={progressValue} color={progressValue < 90 ? 'green' : 'red'} />
{/if}
