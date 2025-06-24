<script lang="ts">
  import { Button, ButtonGroup, Input, cn } from 'flowbite-svelte';
  import { PhoneHangupSolid } from 'flowbite-svelte-icons';
  import store from '@store/client';
  import { connectedToRoom, roomCode } from '@store/playerStore';
  import { socketConnected } from '@store/socketStore';

  $: iceServers = $store.iceServers;
  $: autoUpdateState = $store.autoUpdateState;

  export let joinRoomCallback: () => void;
  export let disconnectRoomCallback: () => void;
</script>

<ButtonGroup
  class={cn(
    'w-full max-w-64',
    // $connectedToRoom && 'max-w-54 ml-4 mr-4'
  )}
  size={!$connectedToRoom ? 'md' : 'md'}
>
  <Input
    class="select-text cursor-text!"
    id="room-code"
    name="room-code"
    disabled={$connectedToRoom || !$socketConnected}
    bind:value={$roomCode}
    placeholder="Room code"
  />
  {#if $connectedToRoom && $socketConnected}
    <Button
      color="red"
      class="cursor-pointer"
      type="submit"
      onclick={() => {
        disconnectRoomCallback();
      }}
    >
      <PhoneHangupSolid
        color="white"
        class={cn('cursor-pointer select-none transition-all duration-300')}
      /></Button
    >
  {:else}
    <Button
      color="primary"
      class="cursor-pointer"
      type="submit"
      onclick={joinRoomCallback}
      disabled={$connectedToRoom ||
        !$socketConnected ||
        !iceServers.length ||
        !$roomCode ||
        autoUpdateState?.state === 'downloading'}
    >
      Join</Button
    >{/if}
</ButtonGroup>
