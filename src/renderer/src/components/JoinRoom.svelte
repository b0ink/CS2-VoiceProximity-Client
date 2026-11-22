<script lang="ts">
  import { Button, ButtonGroup, Input, cn } from 'flowbite-svelte';
  import { EyeSlashSolid, EyeSolid, PhoneHangupSolid } from 'flowbite-svelte-icons';
  import store from '@store/client';
  import { connectedToRoom, roomCode } from '@store/playerStore';
  import { socketConnected } from '@store/socketStore';

  $: iceServers = $store.iceServers;
  $: autoUpdateState = $store.autoUpdateState;

  export let joinRoomCallback: () => void;
  export let disconnectRoomCallback: () => void;

  // The server IP is masked by default on app load, and re-masked every time a room is joined.
  let showServerIp = false;
  $: if ($connectedToRoom) showServerIp = false;

  const toggleServerIp = (): void => {
    showServerIp = !showServerIp;
  };

  const handleRevealKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleServerIp();
    }
  };
</script>

<ButtonGroup
  class={cn(
    'w-full max-w-64',
    // $connectedToRoom && 'max-w-54 ml-4 mr-4'
  )}
  size={!$connectedToRoom ? 'md' : 'md'}
>
  {#if $connectedToRoom}
    <!-- In a room: no eye icon, the whole field is the reveal control so it isn't clicked by accident -->
    <Input
      class={cn('cursor-pointer!', showServerIp ? 'select-text' : 'select-none')}
      id="room-code"
      name="room-code"
      type="text"
      readonly
      value={showServerIp ? $roomCode : ''}
      placeholder="Click to reveal server IP"
      title={showServerIp ? 'Click to hide server IP' : 'Click to reveal server IP'}
      aria-label={showServerIp ? 'Server IP, click to hide' : 'Click to reveal server IP'}
      onclick={toggleServerIp}
      onkeydown={handleRevealKeydown}
    />
  {:else}
    <Input
      class="select-text cursor-text! pe-10"
      id="room-code"
      name="room-code"
      type={showServerIp ? 'text' : 'password'}
      autocomplete="off"
      spellcheck="false"
      disabled={!$socketConnected}
      bind:value={$roomCode}
      placeholder="Room code"
    >
      {#snippet right()}
        <button
          type="button"
          class="cursor-pointer text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          aria-label={showServerIp ? 'Hide server IP' : 'Show server IP'}
          title={showServerIp ? 'Hide server IP' : 'Show server IP'}
          onclick={toggleServerIp}
        >
          {#if showServerIp}
            <EyeSlashSolid size="md" />
          {:else}
            <EyeSolid size="md" />
          {/if}
        </button>
      {/snippet}
    </Input>
  {/if}
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
        !iceServers?.length ||
        !$roomCode ||
        autoUpdateState?.state === 'downloading'}
    >
      Join</Button
    >{/if}
</ButtonGroup>
