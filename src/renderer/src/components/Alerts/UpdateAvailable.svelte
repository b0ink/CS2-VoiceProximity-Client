<script lang="ts">
  import { Alert, Progressbar } from 'flowbite-svelte';
  import store from '@store/client';

  $: autoUpdateState = $store.autoUpdateState;
</script>

{#if autoUpdateState !== null}
  {#if autoUpdateState.state === 'available' && autoUpdateState.info}
    <Alert color="lime" class="text-center mb-4 mt-4 w-full">
      <span class="font-medium">
        An update is available! v{autoUpdateState.info.version}
        <button
          class="underline cursor-pointer hover:text-black"
          onclick={() => {
            window.api.downloadUpdate();
          }}>Download now</button
        >
      </span>
    </Alert>
  {:else if autoUpdateState.state === 'error'}
    <Alert color="red" class="text-center mb-4 mt-4 w-full">
      <div class="font-medium">
        Failed to download update. Please restart the app and try again.
      </div>
    </Alert>
  {:else}
    <Alert color="lime" class="text-center mb-4 mt-4 w-full">
      <div class="font-medium mb-2">
        {autoUpdateState?.state === 'downloading'
          ? 'Downloading update...'
          : 'Waiting for download...'}
        {Math.floor(autoUpdateState.progress?.percent ?? 0)}%
      </div>
      <div class="font-medium mb-2">
        ({Math.round((autoUpdateState.progress?.transferred ?? 0) / 1024 / 1024)}MB /
        {Math.round((autoUpdateState.progress?.total ?? 0) / 1024 / 1024)}MB)
      </div>
      <Progressbar
        animate
        progress={autoUpdateState.progress?.percent ?? 0}
        color={(autoUpdateState.progress?.percent ?? 0 < 100) ? 'blue' : 'lime'}
      />
    </Alert>
  {/if}
{/if}
