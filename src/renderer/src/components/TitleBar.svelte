<script lang="ts">
  import { Heading } from 'flowbite-svelte';
  import { CloseOutline } from 'flowbite-svelte-icons';
  import MicrophoneButton from './MicrophoneButton.svelte';
  import SettingsButton from './SettingsButton.svelte';
</script>

<div
  class="relative h-10 flex justify-between items-center w-dvw dark:bg-gray-950 pl-3 pr-3 draggable z-50 select-none"
>
  <div class="no-drag flex gap-0.5">
    <SettingsButton />
    <MicrophoneButton />
  </div>

  <Heading tag="h2" class="absolute left-1/2 -translate-x-1/2 text-md text-center text-gray-400!"
    >CS2 Proximity Chat</Heading
  >
  <div class="no-drag">
    <CloseOutline
      color="grey"
      class="cursor-pointer hover:text-gray-300 rounded-full"
      onclick={() => {
        window.api.quitApp();
      }}
    />
  </div>
</div>

<style>
  .draggable {
    -webkit-app-region: drag;
  }
  .no-drag {
    -webkit-app-region: no-drag;
  }
</style>
