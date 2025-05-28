<script lang="ts">
  import { Range } from 'flowbite-svelte';
  import { cn } from 'flowbite-svelte';
  import { MicrophoneSlashSolid, UserSolid } from 'flowbite-svelte-icons';
  import { onMount } from 'svelte';
  import { DEFAULT_PLAYER_VOLUME, MAX_PLAYER_VOLUME } from '@shared/types/store/settings';
  import settings from '../store/settings';
  import { CsTeam } from '../type';

  $: playerVolumes = $settings.playerVolumes;

  interface PlayerData {
    steamId: string;
    name: string;
    peerConnectionExists: boolean;
    peer: string | undefined;
    isMuted?: boolean;
    team?: CsTeam;
    bandwidth: number | null;
  }
  export let playerIsClient: boolean;
  export let player: PlayerData;

  let playerVolume: number;

  onMount(() => {
    playerVolume = playerVolumes[player.steamId] ?? 250;
  });
</script>

{#if player.steamId !== '0'}
  {@const title =
    player.bandwidth && player.bandwidth > 0
      ? `${player.name}: ${(player.bandwidth / 125000).toFixed(2)} MB`
      : 'N/A'}
  <div
    {title}
    class={cn(
      'text-left flex items-center justify-between',
      // playerLength > 30 ? 'text-xs' : playerLength > 20 ? 'text-sm' : '',
      'text-sm',
      playerIsClient
        ? 'underline font-bold text-green-400'
        : title === 'N/A'
          ? 'text-red-500' // Indicate peer is not fully connected
          : 'text-white', // Connected peer
    )}
  >
    <div class="whitespace-nowrap overflow-hidden flex items-center">
      <!-- T: #ccba7c -->
      <!-- CT: #5d79ae -->
      <!-- SPEC: #0c0f12 -->
      <UserSolid
        class={cn('mr-1')}
        color={player.team === CsTeam.Terrorist
          ? '#ccba7c'
          : player.team === CsTeam.CounterTerrorist
            ? '#5d79ae'
            : '#0c0f12'}
      />
      <button class="truncate cursor-pointer hover:text-primary-500">
        {player.name}
      </button>
      {#if player.isMuted}
        <MicrophoneSlashSolid color="#e64047" class="ml-1" size="sm" />
        <!-- <MicrophoneSlashSolid color="grey" class="ml-2" size="sm" /> -->
      {/if}
    </div>
    {#if !playerIsClient}
      <Range
        class="ml-5  max-w-24 "
        size="sm"
        id="range1"
        min="0"
        max={MAX_PLAYER_VOLUME}
        step="10"
        bind:value={playerVolume}
        color={playerVolume === 0 ? 'red' : 'blue'}
        oninput={() => {
          const updatedVolumes = { ...playerVolumes };
          if (playerVolume === DEFAULT_PLAYER_VOLUME) {
            delete updatedVolumes[player.steamId];
          } else {
            updatedVolumes[player.steamId] = playerVolume;
          }
          window.api.setSettingsValue('playerVolumes', updatedVolumes);
        }}
      />
    {/if}
  </div>
{/if}
