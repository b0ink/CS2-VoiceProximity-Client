<script lang="ts">
  import type { PlayerPositionApiData, SocketClientMap } from '../type';

  export let mySteamId: string;
  export let players: PlayerPositionApiData[];
  export let joinedSocketConnections: SocketClientMap;

  interface PlayerData {
    SteamId: string;
    Name: string;
  }

  let joinedPlayers: PlayerData[] = [];

  let clientIsOnServer: boolean = false;

  $: if (players && players.length) {
    clientIsOnServer = false;
    joinedPlayers = [];

    // Retrieve names from the cs2 server, and only display players that have joined the voice chat
    for (const player of players) {
      const SteamId = player.SteamId;
      if (!SteamId) continue;

      if (
        SteamId === mySteamId ||
        Object.values(joinedSocketConnections).some((c) => c.steamId === SteamId)
      ) {
        if (SteamId == mySteamId) {
          clientIsOnServer = true;
        }
        joinedPlayers.push({ SteamId, Name: player.Name });
      }
    }

    // Some players could be in the call, but not on the server yet, let's display their steamID instead
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_peer, client] of Object.entries(joinedSocketConnections)) {
      const SteamId = client.steamId;
      const player = joinedPlayers.find((p) => p.SteamId === SteamId);
      if (!player) {
        joinedPlayers.push({ SteamId, Name: SteamId });
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
          {#if player.SteamId !== '0'}
            <div class="w-fit">{player.Name}{player.SteamId === mySteamId ? ' (You)' : ''}</div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
