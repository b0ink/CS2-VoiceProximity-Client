<script lang="ts">
  import { cn } from '../lib/tailwind';
  import type { PeerConnectionBandwidth, PlayerPositionApiData, SocketClientMap } from '../type';

  export let mySteamId: string;
  export let players: PlayerPositionApiData[];
  export let joinedSocketConnections: SocketClientMap;
  export let peerConnectingBandwidth: PeerConnectionBandwidth;

  interface PlayerData {
    steamId: string;
    name: string;
    peerConnectionExists: boolean;
    peer: string | undefined;
  }

  let joinedPlayers: PlayerData[] = [];

  let clientIsOnServer: boolean = false;

  $: if (
    players &&
    players.length &&
    joinedSocketConnections &&
    peerConnectingBandwidth &&
    mySteamId
  ) {
    clientIsOnServer = false;
    joinedPlayers = [];

    // Retrieve names from the cs2 server, and only display players that have joined the voice chat
    for (const player of players) {
      const steamId = player.steamId;
      if (!steamId) continue;

      const [playerPeer, playerFromPeerConnection] =
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(joinedSocketConnections).find(([_, c]) => c.steamId === steamId) || [];

      if (steamId === mySteamId || playerFromPeerConnection) {
        if (steamId == mySteamId) {
          clientIsOnServer = true;
        }
        if (player.name !== undefined) {
          joinedPlayers.push({
            steamId,
            name: player.name,
            peerConnectionExists: playerFromPeerConnection !== undefined,
            peer: playerFromPeerConnection !== undefined && playerPeer ? playerPeer : undefined,
          });
        }
      }
    }

    // Some players could be in the call, but not on the server yet, let's display their steamID instead
    for (const [_peer, client] of Object.entries(joinedSocketConnections)) {
      const steamId = client.steamId;
      const player = joinedPlayers.find((p) => p.steamId === steamId);
      if (!player) {
        joinedPlayers.push({ steamId, name: steamId, peerConnectionExists: true, peer: _peer });
      }
    }

    // console.log(players);
    // console.log(joinedSocketConnections);
    // console.log(joinedPlayers);
  }
</script>

<div class="w-full">
  <div class="text-center text-white">Joined Players</div>
  <div class="text-center w-full">
    {#if !clientIsOnServer}
      <div class="text-red-600 italic"><i>You are not on the server yet.</i></div>
    {/if}

    {#if players}
      <!-- TODO: fix up css of columns -->
      <div
        class="columns-1 sm:columns-2 md:columns-3 text-white space-y-1 h-28 overflow-auto-y w-fit text-center"
      >
        {#each joinedPlayers as player (player)}
          {#if player.steamId !== '0'}
            <div class={cn('w-fit', player.peerConnectionExists ? 'text-white' : 'text-red-600')}>
              {player.name}{player.steamId === mySteamId ? ' (You)' : ''}
              {#if player.peer && peerConnectingBandwidth[player.peer]}
                ({(peerConnectingBandwidth[player.peer] / 125000).toFixed(2)}) MB
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
