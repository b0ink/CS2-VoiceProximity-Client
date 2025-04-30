<script lang="ts">
  import type { CsTeam } from '../type';

  interface PlayerPositionApiData {
    SteamId?: string;
    Name?: string;
    OriginX?: number;
    OriginY?: number;
    OriginZ?: number;
    LookAtX?: number;
    LookAtY?: number;
    LookAtZ?: number;
    IsAlive?: boolean;
    Team?: CsTeam;
  }

  export let mySteamId: string;
  export let players: PlayerPositionApiData[];
</script>

<div style="text-align: left;width:100%">
  <div>Joined Players:</div>
  {#each players as player (player)}
    {#if player.SteamId !== '0'}
      <div>{player.Name}{player.SteamId === mySteamId ? ' (You)' : ''}</div>
    {/if}
  {/each}
</div>
