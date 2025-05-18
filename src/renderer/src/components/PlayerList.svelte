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

  $: playerLength = joinedPlayers.length;
</script>

<div class="w-full min-h-screen">
  <div class="text-center mb-2 font-bold text-primary-600">Joined Players</div>
  <div class="text-center w-full">
    {#if !clientIsOnServer}
      <div class="text-red-600 italic"><i>You are not on the server yet.</i></div>
    {/if}

    {#if players}
      <div
        class={cn(
          'grid text-center justify-between',
          // Each grid-cols-* class is hardcoded so that tailwind can calculate each step properly (weird bug if the class is dynamic)
          playerLength <= 5 && 'grid-cols-1',
          playerLength <= 10 && playerLength > 5 && 'grid-cols-2',
          playerLength <= 15 && playerLength > 10 && 'grid-cols-3',
          playerLength <= 20 && playerLength > 15 && 'grid-cols-4',
          playerLength <= 30 && playerLength > 20 && 'grid-cols-5',
          playerLength <= 48 && playerLength > 30 && 'grid-cols-6',
          playerLength <= 56 && playerLength > 48 && 'grid-cols-7',
          playerLength > 56 && 'grid-cols-8',
        )}
      >
        {#each joinedPlayers as player (player)}
          {#if player.steamId !== '0'}
            {@const bandwidth = player.peer ? peerConnectingBandwidth[player.peer] : null}
            {@const title =
              bandwidth && bandwidth > 0
                ? `${player.name}: ${(bandwidth / 125000).toFixed(2)} MB`
                : 'N/A'}
            <div
              {title}
              class={cn(
                'truncate  whitespace-nowrap text-center overflow-hidden',
                playerLength > 30 ? 'text-xs' : playerLength > 20 ? 'text-sm' : '',
                player.steamId === mySteamId
                  ? 'underline font-bold text-green-400'
                  : title === 'N/A'
                    ? 'text-red-500' // Indicate peer is not fully connected
                    : 'text-white', // Connected peer
              )}
            >
              {player.name}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
