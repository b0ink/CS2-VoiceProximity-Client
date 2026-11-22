<script lang="ts">
  import { Button, ButtonGroup, Input, Label, Modal, Select } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import { SERVER_URL_HINT, normalizeServerUrl } from '@shared/server-url';
  import store from '@store/client';
  import settings from '@store/settings';
  import { cn } from '../lib/tailwind';

  $: storedSocketServer = $settings.socketServer;
  let socketServerInput: string;
  let confirmModalOpen = false;
  let serverUrlError = '';

  // Clear the error as soon as the address is edited.
  $: if (socketServerInput !== undefined) serverUrlError = '';

  $: regions = $store.regions;
  let serverRegion: string | null;

  onMount(() => {
    window.api.getRegionPings();
  });

  $: if (storedSocketServer) {
    getStoredSocketServer();
  }

  const getStoredSocketServer = (): void => {
    socketServerInput = storedSocketServer || '';
    serverRegion = storedSocketServer;
    const region = regions.find((_region) => _region.url === serverRegion);
    if (!region && storedSocketServer) {
      serverRegion = 'custom';
    }
  };

  const saveSocketServer = async (): Promise<void> => {
    if (socketServerInput === storedSocketServer) {
      return;
    }
    try {
      await window.api.setSettingsValue('socketServer', socketServerInput);
    } catch {
      // Rejected by the main process; keep the current login and don't reload.
      serverUrlError = SERVER_URL_HINT;
      return;
    }
    window.api.setStoreValue('token', null);
    window.api.setStoreValue('steamId', null);
    window.api.setStoreValue('iceServers', []);
    window.api.reloadApp();
  };

  const promptConfirmation = (): void => {
    const serverUrl = normalizeServerUrl(socketServerInput);
    if (!serverUrl) {
      serverUrlError = SERVER_URL_HINT;
      return;
    }
    socketServerInput = serverUrl;
    if (serverUrl === storedSocketServer) {
      return; // e.g. only a trailing slash was different
    }
    confirmModalOpen = true;
  };

  $: socketServerLabel =
    regions.find((r) => r.url === socketServerInput)?.name || socketServerInput;
</script>

<Modal title="Confirm" bind:open={confirmModalOpen} autoclose>
  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    Changing the socket server to <span class="text-primary-600 font-bold">{socketServerLabel}</span
    > will require you to sign in again.
  </p>

  <!-- <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    Only update this if you're sure about what it does.
  </p> -->

  {#snippet footer()}
    <Button onclick={saveSocketServer}>Save</Button>
    <Button
      color="alternative"
      onclick={() => {
        getStoredSocketServer();
      }}>Cancel</Button
    >
  {/snippet}
</Modal>

<div class="w-full">
  <Label for="socket-server" class="mb-2">
    <span>Server Region:</span>
    <p class="text-xs text-gray-400">
      Select the region your CS2 server is configured for to join the room.
    </p>
  </Label>

  <Select
    bind:value={serverRegion}
    placeholder="Select a region..."
    id="server-region"
    class={cn('mb-4')}
    onchange={() => {
      console.log(serverRegion, storedSocketServer);
      if (serverRegion !== 'custom' && serverRegion !== storedSocketServer) {
        socketServerInput = serverRegion || '';
        confirmModalOpen = true;
      }
    }}
  >
    {#each regions as region (region.url)}
      <option value={region.url} disabled={region.disabled || region.ping === -1}
        >{region.name} ({region.ping !== -1 ? `${region.ping} ms` : 'N/A'})</option
      >
    {/each}
    <option value="custom">Custom Server (URL)</option>
  </Select>

  {#if serverRegion === 'custom'}
    <ButtonGroup class="w-full border-none mb-2">
      <Input
        id="socket-server"
        name="socket-server"
        bind:value={socketServerInput}
        placeholder="https://voice.example.com"
        color={serverUrlError
          ? 'red'
          : socketServerInput !== storedSocketServer
            ? 'amber'
            : 'default'}
        required
      />

      <Button
        color="primary"
        class="cursor-pointer"
        type="submit"
        disabled={socketServerInput === storedSocketServer}
        onclick={promptConfirmation}>Save</Button
      >
    </ButtonGroup>
    {#if serverUrlError}
      <p class="text-xs text-red-500 mb-2" id="server-url-error">{serverUrlError}</p>
    {/if}
  {/if}
</div>
