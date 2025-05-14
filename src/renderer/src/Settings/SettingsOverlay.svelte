<script lang="ts">
  import { Button, Heading, Label, Modal, Select, Toggle } from 'flowbite-svelte';
  import ChangeSocketServer from './ChangeSocketServer.svelte';
  import ClientInfo from './ClientInfo.svelte';
  import { onMount } from 'svelte';
  export let open: boolean;
  export let selectedDeviceId: string;
  export let isConnected: boolean;
  export let devices;
  export let mapName: string;
  export let clientSteamId: string;
  export let socketUrl: string;
  export let onMapChange: () => void;

  let alwaysOnTop: boolean;
  const toggleAlwaysOnTop = () => {
    alwaysOnTop = !alwaysOnTop;
    window.api.setStoreValue('setting_alwaysOnTop', alwaysOnTop);
  };

  let natFixEnabled: boolean;
  let confirmDisableNatFix: boolean = false;
  let modalNatFixOffButtonDisabled: boolean = true;
  const toggleNatFix = (e: any) => {
    if (natFixEnabled) {
      confirmDisableNatFix = true;
      modalNatFixOffButtonDisabled = true;
      setTimeout(() => {
        modalNatFixOffButtonDisabled = false;
      }, 2500);
      e.preventDefault();
      return;
    } else {
      window.api.setStoreValue('setting_natFixEnabled', true);
      loadSettings();
      modalConfirmRestartRequired = true;
    }
  };

  let modalConfirmRestartRequired: boolean = false;

  let hqVoice: boolean;
  const toggleHqVoice = () => {
    hqVoice = !hqVoice;
    window.api.setStoreValue('setting_hqVoice', hqVoice);
    modalConfirmRestartRequired = true;
  };

  onMount(() => {
    loadSettings();
  });

  const loadSettings = async () => {
    alwaysOnTop = await window.api.getStoreValue('setting_alwaysOnTop', true);
    natFixEnabled = await window.api.getStoreValue('setting_natFixEnabled', true);
    hqVoice = await window.api.getStoreValue('setting_hqVoice', true);
  };
</script>

<Modal title="Confirm" bind:open={confirmDisableNatFix} autoclose>
  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    Disabling the NAT fix can improve voice latency by allowing direct connections between users
    (P2P).
  </p>

  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    However, this will <span class="font-bold">expose your IP address</span> to other users who also
    have the NAT fix disabled. Only disable this if you're on a private server with people you trust.
  </p>

  {#snippet footer()}
    <Button
      onclick={() => {
        window.api.setStoreValue('setting_natFixEnabled', false);
        loadSettings();
        modalConfirmRestartRequired = true;
      }}
      disabled={modalNatFixOffButtonDisabled}>Turn it off</Button
    >
    <Button
      color="alternative"
      onclick={() => {
        window.api.setStoreValue('setting_natFixEnabled', true);
        loadSettings();
      }}>Cancel</Button
    >
  {/snippet}
</Modal>

<Modal title="Confirm" bind:open={modalConfirmRestartRequired} autoclose>
  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    You must restart the app to apply these changes.
  </p>

  {#snippet footer()}
    <Button
      onclick={() => {
        window.api.reloadApp();
      }}>Restart now</Button
    >
    <Button
      color="alternative"
      onclick={() => {
        modalConfirmRestartRequired = false;
      }}>Restart later</Button
    >
  {/snippet}
</Modal>

{#if open}
  <div
    class="w-full h-lvh absolute dark:bg-gray-900/50 backdrop-blur-xl z-10 p-5 overflow-y-scroll scrollbar"
  >
    <div class="text-center">
      <Heading tag="h1" class="mb-4 text-2xl font-extrabold md:text-5xl lg:text-6xl"
        >Settings</Heading
      >
    </div>

    <div class="mb-6 grid gap-4 md:grid-cols-2">
      <div>
        <Label for="mic" class="mb-2">Microphone:</Label>
        <Select
          id="mic"
          bind:value={selectedDeviceId}
          disabled={isConnected}
          onchange={() => {
            modalConfirmRestartRequired = true;
          }}
        >
          {#each devices as device (device.deviceId)}
            <option value={device.deviceId}>{device.label || 'Unnamed Device'}</option>
          {/each}
        </Select>
      </div>
      <div>
        <Label for="map" class="mb-2">Map:</Label>
        <Select bind:value={mapName} onchange={onMapChange} id="map">
          <option value="de_dust2">Dust 2</option>
          <option value="de_mirage">Mirage</option>
          <option value="de_inferno">Inferno</option>
          <option value="de_nuke">Nuke</option>
        </Select>
      </div>

      <ChangeSocketServer open={true} />
      <div>
        <Label class="mb-2">Window preferences:</Label>
        <Toggle
          id="always-on-top"
          checked={alwaysOnTop}
          class="justify-between mb-2"
          onclick={toggleAlwaysOnTop}
        >
          {#snippet offLabel()}
            Always On Top
          {/snippet}</Toggle
        >
      </div>
      <div>
        <Label class="mb-2">Voice preferences:</Label>
        <Toggle
          id="nat-fix"
          checked={natFixEnabled}
          class="justify-between mb-2"
          onclick={toggleNatFix}
        >
          {#snippet offLabel()}
            NAT Fix
          {/snippet}</Toggle
        >
        <Toggle
          id="hq-voice"
          checked={hqVoice}
          class="justify-between mb-2"
          onclick={toggleHqVoice}
        >
          {#snippet offLabel()}
            High-Quality Mic
          {/snippet}</Toggle
        >
      </div>
      <br />
      <!-- 
      <Button
        class="cursor-pointer"
        onclick={() => {
          open = false;
        }}>Close</Button
      > -->

      {#if clientSteamId}
        <button
          class="opacity-100 underline cursor-pointer text-white w-fit m-auto"
          onclick={async () => {
            await window.api.setStoreValue('steamId', null);
            await window.api.setStoreValue('token', null);
            window.api.reloadApp();
            open = false;
          }}>Sign Out</button
        >
      {/if}
    </div>
    <ClientInfo {clientSteamId} {socketUrl} />
  </div>
{/if}

<style>
  .scrollbar {
    overflow-y: scroll;

    /* Firefox */
    /* scrollbar-width: none; */

    /* IE 10+ */
    /* -ms-overflow-style: none; */
    padding-right: 10px;
  }

  .scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .scrollbar::-webkit-scrollbar-corner {
    background: rgba(0, 0, 0, 0);
  }
  .scrollbar::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 6px;
    border: 4px solid rgba(0, 0, 0, 0);
    background-clip: content-box;
    min-width: 32px;
    min-height: 32px;
  }
  .scrollbar::-webkit-scrollbar-track {
    background-color: rgba(0, 0, 0, 0);
  }
</style>
