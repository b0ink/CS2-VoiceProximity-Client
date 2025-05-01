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

    for (const player of players) {
      const SteamId = player.SteamId;
      if (!SteamId) continue;

      if (SteamId === mySteamId || Object.values(joinedSocketConnections).some((c) => c.steamId === SteamId)) {
        if (SteamId == mySteamId) {
          clientIsOnServer = true;
        }
        joinedPlayers.push({ SteamId, Name: player.Name });
      }
    }
  }
</script>

<div style="text-align: left;width:100%">
  <div>Joined Players:</div>
  {#if !clientIsOnServer}
    <div style="color:red"><i>You are not on the server yet.</i></div>
  {/if}
  {#if players}
    {#each joinedPlayers as player (player)}
      {#if player.SteamId !== '0'}
        <div>{player.Name}{player.SteamId === mySteamId ? ' (You)' : ''}</div>
      {/if}
    {/each}
  {/if}
</div>
