<script lang="ts">
  import { Alert, Button } from 'flowbite-svelte';
  import { onDestroy } from 'svelte';
  import { nextServerRestart, timeUntilRestart } from '@store/appStore';
  import store from '@store/client';
  import { connectedToRoom, detectedRoomCode, roomCode } from '@store/playerStore';
  import { socketConnected } from '@store/socketStore';
  import UpdateAvailable from './UpdateAvailable.svelte';

  $: clientSteamId = $store.steamId;
  $: autoUpdateState = $store.autoUpdateState;
  $: iceServers = $store.iceServers;

  export let joinRoomCallback: () => void;

  // Right after sign-in (or app load) the socket connection and TURN credential fetch usually
  // finish within a second. Hold back the "connecting" / TURN alerts for a short grace period so
  // they don't flash on screen, and only show them if the requests are still pending or failed.
  const SIGN_IN_ALERT_GRACE_MS = 1500;
  let signInGraceElapsed = false;
  let signInGraceTimer: ReturnType<typeof setTimeout> | undefined;

  function startSignInGrace(steamId: string | null | undefined): void {
    if (!steamId) {
      clearTimeout(signInGraceTimer);
      signInGraceTimer = undefined;
      signInGraceElapsed = false;
      return;
    }
    if (signInGraceTimer) {
      return;
    }
    signInGraceTimer = setTimeout(() => {
      signInGraceElapsed = true;
    }, SIGN_IN_ALERT_GRACE_MS);
  }

  $: startSignInGrace(clientSteamId);

  onDestroy(() => clearTimeout(signInGraceTimer));
</script>

<UpdateAvailable />

{#if clientSteamId && signInGraceElapsed && !$socketConnected}
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

{#if clientSteamId && signInGraceElapsed && !iceServers?.length}
  <Alert color="orange" class="text-center mb-4">
    <span class="font-medium">Failed to fetch TURN credentials.</span>
    <p>Please try logging out and back in, restarting the app, or try again later.</p>
  </Alert>
{/if}
