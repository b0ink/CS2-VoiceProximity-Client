<script lang="ts">
  import { Alert, Button } from 'flowbite-svelte';
  import { nextServerRestart, timeUntilRestart } from '@store/appStore';
  import store from '@store/client';
  import { connectedToRoom, detectedRoomCode, roomCode } from '@store/playerStore';
  import { socketConnected } from '@store/socketStore';
  import UpdateAvailable from './UpdateAvailable.svelte';

  $: clientSteamId = $store.steamId;
  $: autoUpdateState = $store.autoUpdateState;
  $: turnUsername = $store.turnUsername;
  $: turnPassword = $store.turnPassword;

  export let joinRoomCallback: () => void;
</script>

<UpdateAvailable />

{#if clientSteamId && !$socketConnected}
  <Alert color="yellow" class="text-center mb-4">
    <span class="font-medium">Connecting to the backend service...</span>
  </Alert>
{/if}
{#if $detectedRoomCode && !$connectedToRoom && $timeUntilRestart <= 0 && !autoUpdateState}
  <Alert color="green" class="text-center mb-4">
    <span class="font-medium">
      You are connected to a server.<br />(Steam ID detected)<br />
      <Button
        color="green"
        class="cursor-pointer mt-2"
        onclick={() => {
          if ($detectedRoomCode) {
            $roomCode = $detectedRoomCode;
            joinRoomCallback();
          }
        }}>Connect Now</Button
      >
    </span>
  </Alert>
{/if}
{#if $nextServerRestart > Date.now() / 1000 && $timeUntilRestart >= 0}
  <Alert color="orange" class="text-center mb-4">
    <span class="font-medium">
      Voice server restarting in {Math.floor($timeUntilRestart)}s. <br />Rooms reconnect
      automatically.
    </span>
  </Alert>
{/if}

{#if !$detectedRoomCode && !$connectedToRoom && $socketConnected && !autoUpdateState}
  <div class="text-center text-gray-500 text-xs mb-4">
    Join the CS2 Server to auto-retrieve the room code if Proximity Chat is enabled.
  </div>
{/if}

{#if clientSteamId && (!turnUsername || !turnPassword)}
  <Alert color="orange" class="text-center mb-4">
    <span class="font-medium">Failed to fetch TURN credentials.</span>
    <p>Please try logging out and back in, restarting the app, or try again later.</p>
  </Alert>
{/if}
