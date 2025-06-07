<script lang="ts">
  import { cn } from 'flowbite-svelte';
  import { CogSolid } from 'flowbite-svelte-icons';
  import { serverConfigOverlayOpen, settingsOpen } from '@store/appStore';
  import store from '@store/client';

  $: clientSteamId = $store.steamId;
</script>

<CogSolid
  onclick={() => {
    $settingsOpen = !$settingsOpen;
    $serverConfigOverlayOpen = false;
  }}
  color={$settingsOpen ? 'var(--color-primary-600)' : 'grey'}
  class={cn(
    'cursor-pointer z-20 select-none transition-all duration-300',
    // clientSteamId || $settingsOpen ? 'top-7' : 'bottom-5.5',
    !clientSteamId ? 'absolute top-7.5 right-5.5' : '',
    $settingsOpen ? 'rotate-90' : 'rotate-0',
  )}
  size="lg"
/>
