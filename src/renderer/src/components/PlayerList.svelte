<script lang="ts">
  // import { MicrophoneSlashSolid, UserSolid } from 'flowbite-svelte-icons';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { cn } from '../lib/tailwind';
  import settings from '../store/settings';
  import {
    CsTeam,
    type PeerConnectionBandwidth,
    type PlayerPositionApiData,
    type SocketClientMap,
  } from '../type';
  import PlayerRow from './PlayerRow.svelte';

  export let mySteamId: string;
  export let players: PlayerPositionApiData[];
  export let joinedSocketConnections: SocketClientMap;
  export let peerConnectingBandwidth: PeerConnectionBandwidth;

  $: micMuted = $settings.micMuted;
  interface PlayerData {
    steamId: string;
    name: string;
    peerConnectionExists: boolean;
    peer: string | undefined;
    isMuted?: boolean;
    team?: CsTeam;
    bandwidth: number | null;
  }

  onMount(() => {
    // TODO: fetch all player volumes and store it in a writeable
  });

  // let joinedPlayers: PlayerData[] = [];
  // let joinedPlayers: Map<string, PlayerData> = new Map();
  let joinedPlayers = writable<Map<string, PlayerData>>(new Map());

  let clientIsOnServer: boolean = false;

  $: if (
    players &&
    players.length &&
    joinedSocketConnections &&
    peerConnectingBandwidth &&
    mySteamId
  ) {
    clientIsOnServer = false;

    joinedPlayers.update((map) => {
      for (const player of players) {
        const steamId = player.steamId;
        if (!steamId) continue;

        const [playerPeer, playerFromPeerConnection] =
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(joinedSocketConnections).find(([_, c]) => c.steamId === steamId) || [];

        const bandwidth = playerPeer ? peerConnectingBandwidth[playerPeer] : null;

        let isMuted: boolean | undefined = false;

        if (steamId === mySteamId || playerFromPeerConnection) {
          if (steamId === mySteamId) {
            clientIsOnServer = true;
            isMuted = micMuted;
          } else {
            isMuted = playerFromPeerConnection?.isMuted;
          }

          if (player.name !== undefined) {
            map.set(steamId, {
              steamId,
              name: player.name,
              peerConnectionExists: !!playerFromPeerConnection,
              peer: playerFromPeerConnection && playerPeer ? playerPeer : undefined,
              isMuted,
              team: player.team,
              bandwidth,
            });
          }
        }
      }

      return new Map(map); // trigger reactivity
    });

    // Some players could be in the call, but not on the server yet, let's display their steamID instead
    // TODO: put client's name at the top of the list, then sort players by team (so clients team would be first), then spectators at the bottom
    // TODO: and teams are sorted alphabetically?

    // TODO: i think this list is redundant now because we have our playerApiData array that stores players in there - soon as they get removed they get kicked from the server right?

    joinedPlayers.update((map) => {
      for (const steamId of map.keys()) {
        const stillConnected = Object.values(joinedSocketConnections).some(
          (conn) => conn.steamId === steamId,
        );
        if (!stillConnected && steamId !== mySteamId) {
          map.delete(steamId);
        }
      }
      for (const [_peer, client] of Object.entries(joinedSocketConnections)) {
        const steamId = client.steamId;
        if (!steamId) continue;

        if (!map.has(steamId)) {
          const bandwidth = _peer ? peerConnectingBandwidth[_peer] : null;

          map.set(steamId, {
            steamId,
            name: steamId,
            peerConnectionExists: true,
            peer: _peer,
            isMuted: client.isMuted,
            team: CsTeam.None,
            bandwidth,
          });
        }
      }

      return new Map(map); // ensure Svelte reactivity
    });

    // console.log(players);
    // console.log(joinedSocketConnections);
    // console.log(joinedPlayers);
  }

  joinedPlayers.subscribe((map) => {
    console.log(Array.from(map.entries()));
  })();

  // let manageUserModal: boolean = false;
  // let manageUserSteamId: string | undefined = undefined;

  // $: playerLength = joinedPlayers.length;

  let playerListFullscren: boolean = false;

  let DEBUG_PLAYER_LIST: boolean = false;
  // const fakePlayers = [
  //   'boink',
  //   'NadeKing',
  //   'zackie',
  //   'b1ggus',
  //   'haz',
  //   'Nebula',
  //   'Fusion',
  //   'Zithic',
  //   'ShadeBlitz',
  //   'ThornVex',
  //   'Kragstorm',
  //   'NexusFlint',
  //   'Wyrmbite',
  //   'Drakvolt',
  //   'Hexlin',
  //   'GhostRift',
  //   'PyroShade',
  //   'Snarefang',
  //   'ChromaGrim',
  //   'Jinxhowl',
  //   'Nightflint',
  //   'Glitchbeard',
  //   'Razorwulf',
  //   'Vortek',
  //   'Ashlock',
  //   'Mirebane',
  //   'Zyrex',
  //   'Nullfang',
  //   'Blazedge',
  //   'Cryptlynx',
  //   'Toxflare',
  //   'Steelmaw',
  //   'Plasmite',
  //   'Grimnix',
  //   'PhantomBurn',
  //   'Skarnyx',
  //   'Brimwolf',
  //   'Darkflare',
  //   'Thrashjaw',
  //   'Orbclaw',
  //   'Knoxmaw',
  //   'Vexlyn',
  //   'Stormgrin',
  //   'Fangroot',
  //   'Dreadthorn',
  //   'Ignith',
  //   'CobaltSnare',
  //   'Fleckburn',
  //   'Havoktail',
  //   'Quellfang',
  //   'Frostgrim',
  //   'Jaghex',
  //   'Murktooth',
  //   'Lazeth',
  //   'Spineflare',
  //   'Venomrift',
  //   'Grawloch',
  //   'Scarnyx',
  //   'Driftbane',
  //   'Fluxraze',
  //   'Moltraith',
  //   'Venlyn',
  //   'Hollowgrit',
  //   'Nyrvok',
  // ];

  // const debugNumPlayers = 64;

  // if (DEBUG_PLAYER_LIST) {
  //   for (let i = 0; i < debugNumPlayers; i++) {
  //     joinedPlayers.set('asdf', {
  //       name: `${fakePlayers[i]}`,
  //       steamId: 'asdf',
  //       peerConnectionExists: false,
  //       peer: undefined,
  //       isMuted: false,
  //       team: CsTeam.None,
  //     });
  //   }
  // }

  // playerListFullscren = true;
</script>

<!-- TODO: scrollbar -->
{#if playerListFullscren}
  <div
    class={cn(
      'w-lvw h-lvh absolute top-0 left-0 dark:bg-gray-900/90 backdrop-blur-xl z-10 p-5 p2-2',
      // 'overflow-y-scroll scrollbar',
    )}
  >
    hi
  </div>
{/if}

<!-- <div class="text-center mb-2 font-bold text-primary-600 h-full">Joined Players</div> -->

<!-- <Modal title="Login with Steam" bind:open={manageUserModal} autoclose>
  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    Edit {manageUserSteamId}!!
  </p>

  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    Your Steam credentials are never shared with us.
  </p>

  {#snippet footer()}
    <Button
      onclick={() => {
        manageUserModal = false;
      }}>Close</Button
    >
  {/snippet}
</Modal> -->

<div class="text-left w-full overflow-y-scroll h-[200px] scrollbar mt-5">
  {#if !clientIsOnServer && !DEBUG_PLAYER_LIST}
    <div class="text-red-600 italic"><i>You are not on the server yet.</i></div>
  {/if}

  {#if players || DEBUG_PLAYER_LIST}
    <div class={cn('text-left justify-between')}>
      {#each Array.from($joinedPlayers).sort( ([, a], [, b]) => a.name.localeCompare(b.name), ) as [steamId, player] (steamId)}
        <PlayerRow {player} playerIsClient={steamId === mySteamId} />
      {/each}
    </div>
  {/if}
</div>

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
