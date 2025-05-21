<script lang="ts">
  import { Button, Heading, Label, Modal, Select, Toggle, Range } from 'flowbite-svelte';
  import ChangeSocketServer from './ChangeSocketServer.svelte';
  import ClientInfo from './ClientInfo.svelte';
  import { onMount } from 'svelte';
  export let open: boolean;
  // export let mapName: string;
  // export let onMapChange: () => void;

  import settings from '../store/settings';
  import store from '../store/client';
  import { OcclusionQuality } from '../../../shared/types/store';

  $: socketUrl = $settings.socketServer;
  $: clientSteamId = $store.steamId;
  $: storedDeviceId = $settings.inputDeviceId;
  $: natFixEnabled = $settings.natFixEnabled;
  $: hqVoice = $settings.hqVoice;
  $: alwaysOnTop = $settings.alwaysOnTop;
  // $: globalGainAmount = $settings.globalGainAmount;
  $: occlusionQuality = $settings.occlusionQuality;
  $: noiseSuppression = $settings.noiseSuppression;
  $: echoCancellation = $settings.echoCancellation;
  $: occlusionUpdateRate = $settings.occlusionUpdateRate;

  let selectedDeviceId: string | null;

  interface MediaDevice {
    id: string;
    kind: string;
    label: string;
  }

  let inputMediaDevices: MediaDevice[];

  const toggleAlwaysOnTop = (): void => {
    window.api.setSettingsValue('alwaysOnTop', !alwaysOnTop);
  };

  let confirmDisableNatFix: boolean = false;
  let modalNatFixOffButtonDisabled: boolean = true;
  const toggleNatFix = (e: any): void => {
    if (natFixEnabled) {
      confirmDisableNatFix = true;
      modalNatFixOffButtonDisabled = true;
      setTimeout(() => {
        modalNatFixOffButtonDisabled = false;
      }, 2500);
      e.preventDefault();
      return;
    } else {
      window.api.setSettingsValue('natFixEnabled', true);
      modalConfirmRestartRequired = true;
    }
  };

  let modalConfirmRestartRequired: boolean = false;

  const toggleHqVoice = (): void => {
    window.api.setSettingsValue('hqVoice', !hqVoice);
    modalConfirmRestartRequired = true;
  };

  // let gainAmountRangeValue: number;

  // $: if (globalGainAmount) {
  //   gainAmountRangeValue = globalGainAmount;
  // }

  let occlusionUpdateRateValue: number;

  $: if (occlusionUpdateRate) {
    occlusionUpdateRateValue = occlusionUpdateRate;
  }

  let occlusionQualitySelectValue: number;
  $: if (occlusionQuality !== null) {
    occlusionQualitySelectValue = occlusionQuality;
  }
  const onOcclusionQualityChange = (): void => {
    console.log(occlusionQualitySelectValue);
    window.api.setSettingsValue('occlusionQuality', occlusionQualitySelectValue);
  };

  onMount(() => {
    getDevices();
  });

  async function getDevices(): Promise<void> {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    inputMediaDevices = allDevices
      .filter((device) => device.kind === 'audioinput')
      .map((d) => {
        let label = d.label;
        if (d.deviceId === 'default') {
          // label = 'Default';
        } else {
          const match = /.+?\([^(]+\)/.exec(d.label);
          if (match && match[0]) label = match[0];
        }
        return {
          id: d.deviceId,
          kind: d.kind,
          label,
        };
      });
    if (inputMediaDevices.length > 0) {
      // Check if saved device id still exists
      console.log(`stored device id: ${storedDeviceId}`);
      if (inputMediaDevices.find((device) => device.id === storedDeviceId)) {
        selectedDeviceId = storedDeviceId;
        console.log('using stored device id');
      } else {
        // Store the default device if it no longer exists
        console.log('stored device id no longer exists');
        selectedDeviceId = inputMediaDevices[0].id;
        window.api.setSettingsValue('inputDeviceId', selectedDeviceId);
      }
    }
  }
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
        window.api.setSettingsValue('natFixEnabled', false);
        modalConfirmRestartRequired = true;
      }}
      disabled={modalNatFixOffButtonDisabled}>Turn it off</Button
    >
    <Button
      color="alternative"
      onclick={() => {
        window.api.setSettingsValue('natFixEnabled', true);
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
    class="w-full h-lvh absolute dark:bg-gray-900/90 backdrop-blur-xl z-10 p-5 p2-2 overflow-y-scroll scrollbar"
  >
    <div class="text-center">
      <Heading tag="h1" class="mb-4 text-xl font-extrabold">Settings</Heading>
    </div>

    <div class="mb-6 grid gap-4 md:grid-cols-2">
      <div>
        <Label for="mic" class="mb-2">Microphone:</Label>
        <Select
          id="mic"
          bind:value={selectedDeviceId}
          onchange={() => {
            modalConfirmRestartRequired = true;
            console.log(`${selectedDeviceId}`);
            window.api.setSettingsValue('inputDeviceId', selectedDeviceId);
          }}
        >
          {#each inputMediaDevices as device (device.id)}
            <option value={device.id}>{device.label || 'Unnamed Device'}</option>
          {/each}
        </Select>
      </div>
      <!-- <div>
        <Label for="map" class="mb-2">Map:</Label>
        <Select bind:value={mapName} onchange={onMapChange} id="map">
          <option value="de_dust2">Dust 2</option>
          <option value="de_mirage">Mirage</option>
          <option value="de_inferno">Inferno</option>
          <option value="de_nuke">Nuke</option>
        </Select>
      </div> -->

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
        <Toggle
          id="noise-supression"
          checked={noiseSuppression}
          class="justify-between mb-2"
          onclick={() => {
            window.api.setSettingsValue('noiseSuppression', !noiseSuppression);
            modalConfirmRestartRequired = true;
          }}
        >
          {#snippet offLabel()}
            Noise Suppression
          {/snippet}</Toggle
        >
        <Toggle
          id="echo-cancellation"
          checked={echoCancellation}
          class="justify-between mb-2"
          onclick={() => {
            window.api.setSettingsValue('echoCancellation', !echoCancellation);
            modalConfirmRestartRequired = true;
          }}
        >
          {#snippet offLabel()}
            Echo Cancellation
          {/snippet}</Toggle
        >
        <Label title="" for="occlusion-quality" class="">Sound Occlusion Detail:</Label>
        <p class="text-xs text-gray-400 mb-2">
          Controls how precisely sound is blocked. Higher levels use more raycasts and may reduce
          performance.
        </p>

        <Select
          bind:value={occlusionQualitySelectValue}
          onchange={onOcclusionQualityChange}
          id="occlusion-quality"
          class="mb-4"
        >
          <option value={OcclusionQuality.OFF}>Off</option>
          <option value={OcclusionQuality.LOW}>Low</option>
          <option value={OcclusionQuality.MEDIUM}>Medium</option>
          <option value={OcclusionQuality.HIGH}>High</option>
        </Select>
        <!-- <Label>
          Sound occlusion update delay: {occlusionUpdateIntervalValue === 1
            ? 'Every frame'
            : `Every ${occlusionUpdateIntervalValue} frames`}
        </Label> -->
        <Label>
          Sound occlusion update rate: {occlusionUpdateRateValue * 100}ms
        </Label>
        <p class="text-xs text-gray-400 mb-2">
          Controls how often audio occlusion is recalculated. Increasing the delay can improve
          performance but may cause a brief lag before players become audible.
        </p>
        <Range
          class="mb-4"
          id="range1"
          min="1"
          max="5"
          step="1"
          bind:value={occlusionUpdateRateValue}
          oninput={() => {
            window.api.setSettingsValue('occlusionUpdateRate', occlusionUpdateRateValue);
          }}
        />
        <!-- <Label>Player volume boost: {Math.floor(gainAmountRangeValue * 100)}%</Label>
        <p class="text-xs text-gray-400 mb-2">Adjusts the overall volume level for all players.</p>
        <Range
          class="mb-2"
          id="range1"
          min="0"
          max="5"
          step="0.1"
          bind:value={gainAmountRangeValue}
          oninput={() => {
            window.api.setSettingsValue('globalGainAmount', gainAmountRangeValue);
          }}
        /> -->
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
