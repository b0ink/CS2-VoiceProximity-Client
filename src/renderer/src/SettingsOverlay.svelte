<script lang="ts">
  import { Heading, Label, Select } from 'flowbite-svelte';
  import ClientInfo from './components/ClientInfo.svelte';
  import ChangeSocketServer from './components/ChangeSocketServer.svelte';
  export let open: boolean;
  export let selectedDeviceId: string;
  export let isConnected: boolean;
  export let devices;
  export let mapName: string;
  export let clientSteamId: string;
  export let socketUrl: string;
  export let onMapChange: () => void;
</script>

{#if open}
  <div class="w-full h-lvh absolute dark:bg-gray-900/50 backdrop-blur-xl z-10 p-5 overflow-auto-y">
    <div class="text-center">
      <Heading tag="h1" class="mb-4 text-4xl font-extrabold  md:text-5xl lg:text-6xl"
        >Settings</Heading
      >
    </div>

    <div class="mb-6 grid gap-4 md:grid-cols-2">
      <div>
        <Label for="mic" class="mb-2">Microphone:</Label>
        <Select id="mic" bind:value={selectedDeviceId} disabled={isConnected}>
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
        </Select>
      </div>

      <ChangeSocketServer open={true} />

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
