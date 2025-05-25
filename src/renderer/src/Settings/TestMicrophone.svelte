<script lang="ts">
  import { Button, Progressbar } from 'flowbite-svelte';
  import { onDestroy, onMount } from 'svelte';
  import settings from '../store/settings';
  import { getUserAudio } from '../voice';

  let rms: number = 0;
  let playing: boolean = false;

  onMount(() => {});

  $: microphoneMuted = $settings.micMuted;
  let originalMuteState: boolean;

  const minUpdateRate = 50;
  let lastRefreshTime = 0;

  let processor: ScriptProcessorNode;
  let src: MediaStreamAudioSourceNode;

  let ctx: AudioContext;
  let stream: MediaStream | null;

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

  const getVoice = async (): Promise<void> => {
    const userAudio = await getUserAudio({
      echoCancellation: false,
    });
    if (!userAudio) {
      console.error(`Could not init microphone`);
      return;
    }

    originalMuteState = microphoneMuted;

    if (!microphoneMuted) {
      window.api.toggleMuteMicrophone();
    }

    stream = userAudio.stream;

    ctx = new AudioContext();
    processor = ctx.createScriptProcessor(2048, 1, 1);
    processor.connect(ctx.destination);

    src = ctx.createMediaStreamSource(stream);
    src.connect(processor);
    processor.addEventListener('audioprocess', handleProcess);

    src.connect(ctx.destination);

    playing = true;
  };

  const stopVoice = (): void => {
    if (originalMuteState !== microphoneMuted) {
      window.api.toggleMuteMicrophone();
    }

    console.log('stopping voice');

    processor?.removeEventListener('audioprocess', handleProcess);
    processor?.disconnect();

    src?.disconnect(); // disconnect input

    stream?.getTracks().forEach((track) => track.stop()); // stop mic access
    ctx?.close(); // close AudioContext
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
