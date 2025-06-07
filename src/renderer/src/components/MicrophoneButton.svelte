<script lang="ts">
  import { MicrophoneSlashSolid, MicrophoneSolid } from 'flowbite-svelte-icons';
  import settings from '@store/settings';
  import { cn } from '../lib/tailwind';

  $: microphoneMuted = $settings.micMuted;

  const toggleMute = (): void => {
    window.api.toggleMuteMicrophone();
  };
</script>

<svelte:component
  this={microphoneMuted ? MicrophoneSlashSolid : MicrophoneSolid}
  onclick={toggleMute}
  color={microphoneMuted ? 'red' : 'grey'}
  class={cn(
    'cursor-pointer z-20 select-none transition-all duration-300',
    // 'absolute top-5.5 left-4',
  )}
  size="lg"
/>
