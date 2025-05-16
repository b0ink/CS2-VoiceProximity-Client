<script lang="ts">
  import { Button, ButtonGroup, Input, Label, Modal } from 'flowbite-svelte';
  import settings from '../store/settings';
  import { onMount } from 'svelte';

  export let open: boolean;

  $: storedSocketServer = $settings.socketServer;
  let socketServerInput: string;
  let confirmModalOpen = false;

  onMount(() => {
    socketServerInput = storedSocketServer || '';
  });

  const saveSocketServer = (): void => {
    if (socketServerInput === storedSocketServer) {
      return;
    }
    window.api.setSettingsValue('socketServer', socketServerInput);
    window.api.reloadApp();
  };

  const promptConfirmation = (): void => {
    confirmModalOpen = true;
  };
</script>

{#if open}
  <Modal title="Confirm" bind:open={confirmModalOpen} autoclose>
    <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
      Changing the socket server to <span class="text-primary-600 font-bold"
        >{socketServerInput}</span
      > will reload the app. If you're in a room, you'll need to reconnect afterward.
    </p>

    <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
      Only update this if you're sure about what it does.
    </p>

    {#snippet footer()}
      <Button onclick={saveSocketServer}>Save</Button>
      <Button color="alternative">Cancel</Button>
    {/snippet}
  </Modal>

  <div class="w-full h-20">
    <Label for="socket-server" class="flex flex-col gap-2">
      <span>Socket Server:</span>

      <ButtonGroup class="w-full border-none">
        <Input
          id="socket-server"
          name="socket-server"
          bind:value={socketServerInput}
          placeholder="Socket Server"
          color={socketServerInput !== storedSocketServer ? 'amber' : 'default'}
          required
        />

        <Button
          color="primary"
          class="cursor-pointer"
          type="submit"
          disabled={socketServerInput === storedSocketServer}
          onclick={promptConfirmation}>Save</Button
        >
      </ButtonGroup>
    </Label>
  </div>
{/if}
