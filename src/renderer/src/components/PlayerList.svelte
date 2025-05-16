<script lang="ts">
  import type { PlayerPositionApiData, SocketClientMap } from '../type';

  export let mySteamId: string;
  export let players: PlayerPositionApiData[];
  export let joinedSocketConnections: SocketClientMap;

  interface PlayerData {
    steamId: string;
    name: string;
  }

  let joinedPlayers: PlayerData[] = [];

  let clientIsOnServer: boolean = false;

  $: if (players && players.length) {
    clientIsOnServer = false;
    joinedPlayers = [];

    // Retrieve names from the cs2 server, and only display players that have joined the voice chat
    for (const player of players) {
      const steamId = player.steamId;
      if (!steamId) continue;

      if (
        steamId === mySteamId ||
        Object.values(joinedSocketConnections).some((c) => c.steamId === steamId)
      ) {
        if (steamId == mySteamId) {
          clientIsOnServer = true;
        }
        if (player.name) {
          joinedPlayers.push({ steamId, name: player.name });
        }
      }
    }

    // Some players could be in the call, but not on the server yet, let's display their steamID instead
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_peer, client] of Object.entries(joinedSocketConnections)) {
      const steamId = client.steamId;
      const player = joinedPlayers.find((p) => p.steamId === steamId);
      if (!player) {
        joinedPlayers.push({ steamId, name: steamId });
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
            <div class="w-fit">{player.name}{player.steamId === mySteamId ? ' (You)' : ''}</div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
