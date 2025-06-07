<script lang="ts">
  import { Button, Heading, Input, Label, Modal, Toggle } from 'flowbite-svelte';
  import { Tooltip } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import {
    type ConfigOption,
    DEFAULT_SERVER_CONFIG,
    type ServerConfigData,
    ServerConfigOptions,
  } from '@shared/types/store/server-config';
  import { serverConfigOverlayOpen } from '@store/appStore';
  import store from '@store/client';
  import { clientIsAdmin } from '@store/playerStore';
  import serverConfigStore from '@store/server-config';
  import { socket } from '@store/socketStore';
  import { cn } from '../lib/tailwind';

  $: clientToken = $store.token;

  function saveConfig(cfg: ServerConfigData): void {
    if (!clientToken) {
      return;
    }
    console.log(`Updating config with: ${JSON.stringify(cfg)}`);
    $socket?.emit('update-config', {
      config: cfg,
      clientToken,
    });
    $serverConfigOverlayOpen = false;
  }

  $: serverConfig = $serverConfigStore;

  let config: ServerConfigData;

  onMount(() => {});

  $: if (serverConfig) {
    config = { ...serverConfig };
  }

  let configOptions: ConfigOption[] = [...ServerConfigOptions];

  let configChanged: boolean;

  function onInputChanged(): void {
    for (const opt of configOptions) {
      const key = opt.key;
      opt.changed = config?.[key] !== serverConfig?.[key];
      console.log(key, config?.[key], serverConfig?.[key]);
    }

    configOptions = [...configOptions];

    configChanged = configOptions.some((opt) => opt.changed === true);
    console.log(configOptions);
    console.log(configChanged);
  }

  let confirmResetDefaultModal: boolean = false;
</script>

{#if $serverConfigOverlayOpen}
  <div
    class="w-full h-lvh absolute dark:bg-gray-900/90 backdrop-blur-xl z-10 p-5 p2-2 overflow-y-scroll scrollbar"
  >
    <div class="text-center">
      <Heading tag="h1" class="mb-4 text-xl font-extrabold">Server Config</Heading>
    </div>

    <div>
      <Modal title="Confirm" bind:open={confirmResetDefaultModal} autoclose>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
          Are you sure you want to reset the server configuration to its default settings?
        </p>

        {#snippet footer()}
          <Button
            onclick={() => {
              saveConfig({
                ...DEFAULT_SERVER_CONFIG,
              });
            }}>Reset Defaults</Button
          >
          <Button
            color="alternative"
            onclick={() => {
              confirmResetDefaultModal = false;
            }}>Cancel</Button
          >
        {/snippet}
      </Modal>

      <!-- <Label class="mb-2 mt-4">Server configuration:</Label> -->
      {#if !$clientIsAdmin}
        <div class="text-primary-600 text-xs text-center mb-4 font-bold">
          This configuration is view-only. Changes can only be made by server admins.
        </div>
      {/if}
      {#each configOptions as opt (opt)}
        {#if opt.type === 'number'}
          <div class="mb-3 flex justify-between items-center">
            <Label for={opt.key} class={cn(!$clientIsAdmin ? 'opacity-50 cursor-not-allowed' : '')}>
              {opt.label}:
            </Label>
            <Tooltip>{opt.title}</Tooltip>

            <Input
              id={opt.key}
              name={opt.key}
              class="max-w-18 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              size="sm"
              type="number"
              bind:value={config[opt.key] as number}
              placeholder={`eg. ${DEFAULT_SERVER_CONFIG[opt.key] as number}`}
              required
              disabled={!$clientIsAdmin}
              min={0}
              oninput={() => {
                onInputChanged();
              }}
              color={opt.changed === true ? 'amber' : 'default'}
            />
          </div>
        {:else}
          <div>
            <Toggle
              id="nat-fix"
              bind:checked={config[opt.key] as boolean}
              class={cn('justify-between mb-2')}
              disabled={!$clientIsAdmin}
              onchange={() => {
                onInputChanged();
              }}
              color={opt.changed ? 'amber' : 'primary'}
            >
              {#snippet offLabel()}
                {opt.label}
              {/snippet}</Toggle
            >
            <Tooltip>{opt.title}</Tooltip>
          </div>
        {/if}
      {/each}

      {#if $clientIsAdmin}
        <div class="w-full flex justify-center mt-4">
          <Button
            class={cn(!configChanged ? 'cursor-not-allowed' : 'cursor-pointer')}
            disabled={!configChanged}
            onclick={() => {
              saveConfig(config);
            }}>Save Config</Button
          >
        </div>
        <div class="w-full flex justify-center mt-4">
          <button
            class="text-gray-500 text-sm cursor-pointer hover:text-gray-300"
            on:click={() => {
              confirmResetDefaultModal = true;
            }}>Reset to defaults</button
          >
        </div>
      {/if}
    </div>
  </div>
{/if}
