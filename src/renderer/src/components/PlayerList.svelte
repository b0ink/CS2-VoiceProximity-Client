<script lang="ts">
  import type { PlayerPositionApiData, SocketClientMap } from '../type';

  export let mySteamId: string;
  export let players: PlayerPositionApiData[];
  export let joinedSocketConnections: SocketClientMap;

  interface PlayerData {
    SteamId: string;
    Name: string;
  }

  let joinedPlayers: PlayerData[];

  let clientIsOnServer: boolean = false;

  $: if (players && players.length) {
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

<div style="width:100%">
  <div style="text-align: center;">Joined Players</div>
  <div style="text-align: left">
    {#if !clientIsOnServer}
      <div style="color:red"><i>You are not on the server yet.</i></div>
    {/if}
    <!-- {#each players as player (player)}
      {#if player.SteamId !== '0'}
        <div>{player.Name}{player.SteamId === mySteamId ? ' (You)' : ''}</div>
      {/if}
    {/each} -->

    {#if players}
      {#each joinedPlayers as player (player)}
        {#if player.SteamId !== '0'}
          <div>{player.Name}{player.SteamId === mySteamId ? ' (You)' : ''}</div>
        {/if}
      {/each}
    {/if}
  </div>
</div>
