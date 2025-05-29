<script lang="ts">
  import { Button, Input, Label, Modal, Toggle } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import type { ServerConfigData } from '@shared/types/api';
  import { DEFAULT_SERVER_CONFIG } from '@shared/types/store/server-config';
  import serverConfigStore from '@store/server-config';
  import { cn } from '../lib/tailwind';

  export let isDisabled: boolean = false;
  export let saveConfig: (cfg: ServerConfigData) => void;

  $: serverConfig = $serverConfigStore;

  let config: ServerConfigData;

  onMount(() => {});

  $: if (serverConfig) {
    config = { ...serverConfig };
  }

  interface ConfigOption {
    key: keyof ServerConfigData;
    label: string;
    title?: string;
    placeholder?: string;
    type: 'number' | 'checkbox';
    changed: boolean;
  }

  let configOptions: ConfigOption[] = [
    {
      key: 'deadPlayerMuteDelay',
      label: 'How long after dying player is muted (seconds)',
      type: 'number',
      changed: false,
    },
    {
      key: 'volumeFalloffFactor',
      label: 'Volume Falloff Factor',
      type: 'number',
      changed: false,
    },
    {
      key: 'volumeMaxDistance',
      label: 'Volume Max Distance',
      type: 'number',
      changed: false,
    },
    {
      key: 'occlusionNear',
      label: 'Occlusion Near',
      title: 'The maximum occlusion when player is behind a wall',
      type: 'number',
      changed: false,
    },
    {
      key: 'occlusionFar',
      label: 'Occlusion Far',
      title: "The maximum occlusion when player's distance reaches Occlusion End Distance",
      type: 'number',
      changed: false,
    },
    {
      key: 'occlusionEndDist',
      label: 'Occlusion End Distance',
      title: "The maximum occlusion when player's distance reaches Occlusion End Distance",
      type: 'number',
      changed: false,
    },
    {
      key: 'occlusionFalloffExponent',
      label: 'Occlusion Falloff Factor',
      title: "The maximum occlusion when player's distance reaches Occlusion End Distance",
      type: 'number',
      changed: false,
    },
    {
      key: 'allowDeadTeamVoice',
      label: 'Allow Dead Teammate Comms.',
      title: "The maximum occlusion when player's distance reaches Occlusion End Distance",
      type: 'checkbox',
      changed: false,
    },
    {
      key: 'allowSpectatorC4Voice',
      label: 'Allow C4 Spectator Comms.',
      title: "The maximum occlusion when player's distance reaches Occlusion End Distance",
      type: 'checkbox',
      changed: false,
    },
  ];

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
  {#if isDisabled}
    <div class="text-primary-600 text-xs text-center mb-4 font-bold">
      This configuration is view-only. Changes can only be made by server admins.
    </div>
  {/if}
  {#each configOptions as opt (opt)}
    {#if opt.type === 'number'}
      <div class="mb-3 flex justify-between items-center">
        <Label
          for={opt.key}
          title={opt.title}
          class={cn(isDisabled ? 'opacity-50 cursor-not-allowed' : '')}
        >
          {opt.label}:
        </Label>
        <Input
          id={opt.key}
          name={opt.key}
          class="max-w-18 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          size="sm"
          type="number"
          bind:value={config[opt.key] as number}
          placeholder={`eg. ${DEFAULT_SERVER_CONFIG[opt.key] as number}`}
          required
          disabled={isDisabled}
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
          disabled={isDisabled}
          onchange={() => {
            onInputChanged();
          }}
          color={opt.changed ? 'amber' : 'primary'}
        >
          {#snippet offLabel()}
            {opt.label}
          {/snippet}</Toggle
        >
      </div>
    {/if}
  {/each}

  {#if !isDisabled}
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
