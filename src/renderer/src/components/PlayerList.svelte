<script lang="ts">
  // import { MicrophoneSlashSolid, UserSolid } from 'flowbite-svelte-icons';
  import { Button, Modal } from 'flowbite-svelte';
  import type { Socket } from 'socket.io-client';
  import { writable } from 'svelte/store';
  import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types/api';
  import store from '@store/client';
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
  export let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;
  export let clientIsAdmin: boolean = false;

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

  let manageUserModal: boolean = false;
  let manageUser: PlayerData | null = null;

  // $: playerLength = joinedPlayers.length;

  // let playerListFullscren: boolean = false;

  let DEBUG_PLAYER_LIST: boolean = false;
  // const fakePlayers = [
  //   'boink',
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

  const onPlayerNameClick = (player: PlayerData): void => {
    console.log(`clicked: ${player.steamId}`);
    manageUser = player;
    manageUserModal = true;
  };

  const remotelyMutePlayer = (targetSteamId: string): void => {
    if (!$store.token) {
      return;
    }

    socket?.emit('mute-player', {
      targetSteamId,
      clientToken: $store.token,
    });

    manageUser = null;
    manageUserModal = false;
  };
</script>

<!-- <div class="text-center mb-2 font-bold text-primary-600 h-full">Joined Players</div> -->

<Modal title="Manage Player" bind:open={manageUserModal} autoclose>
  <div class="text-base leading-relaxed text-gray-500 dark:text-gray-400 mb-1">
    Name: {manageUser?.name}
  </div>
  <div class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    SteamID: {manageUser?.steamId}
  </div>

  {#snippet footer()}
    <Button
      tabindex={0}
      class="cursor-pointer"
      onclick={() => {
        manageUserModal = false;
      }}>Close</Button
    >
  {/snippet}

  {#if clientIsAdmin}
    <div class="w-full flex justify-end">
      <Button
        disabled={manageUser?.isMuted}
        tabindex={2}
        class={cn(manageUser?.isMuted ? 'cursor-default' : 'cursor-pointer')}
        color="red"
        size="xs"
        onclick={() => {
          console.log('mute player');
          if (manageUser?.steamId) {
            remotelyMutePlayer(manageUser.steamId);
          }
        }}>Mute Player</Button
      >
    </div>
  {/if}
</Modal>

<div class="text-left w-full overflow-y-scroll h-[200px] scrollbar mt-5">
  {#if !clientIsOnServer && !DEBUG_PLAYER_LIST}
    <div class="text-red-600 italic"><i>You are not on the server yet.</i></div>
  {/if}

  {#if players || DEBUG_PLAYER_LIST}
    <div class={cn('text-left justify-between')}>
      {#each Array.from($joinedPlayers).sort( ([, a], [, b]) => a.name.localeCompare(b.name), ) as [steamId, player] (steamId)}
        <PlayerRow
          {player}
          playerIsClient={steamId === mySteamId}
          onClick={() => onPlayerNameClick(player)}
        />
      {/each}
    </div>
  {/if}
</div>
