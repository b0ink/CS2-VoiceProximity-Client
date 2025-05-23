<script lang="ts">
  import { Button, ButtonGroup, Input, Label, Modal, Select } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import { cn } from '../lib/tailwind';
  import store from '../store/client';
  import settings from '../store/settings';

  $: storedSocketServer = $settings.socketServer;
  let socketServerInput: string;
  let confirmModalOpen = false;

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

  const saveSocketServer = (): void => {
    if (socketServerInput === storedSocketServer) {
      return;
    }
    window.api.setSettingsValue('socketServer', socketServerInput);
    window.api.setStoreValue('token', null);
    window.api.setStoreValue('steamId', null);
    window.api.setStoreValue('turnUsername', null);
    window.api.setStoreValue('turnPassword', null);
    window.api.reloadApp();
  };

  const promptConfirmation = (): void => {
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
        placeholder="Socket Server"
        color={socketServerInput !== storedSocketServer ? 'amber' : 'default'}
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
  {/if}
</div>
