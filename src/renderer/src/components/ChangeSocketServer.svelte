<script lang="ts">
  import { Button, ButtonGroup, Input, Label, Modal } from 'flowbite-svelte';
  import { onMount } from 'svelte';

  export let open: boolean;
  let socketServer: string;
  let storedSocketServer: string;
  let socketInputHasChanged: boolean;

  let confirmModalOpen = false;
  onMount(() => {
    getSocketServer();
  });

  async function getSocketServer() {
    storedSocketServer = await window.api.getSocketUrl();
    socketServer = storedSocketServer;
  }

  const onChange = () => {
    socketInputHasChanged = socketServer !== storedSocketServer;
  };

  const saveSocketServer = () => {
    if (!socketInputHasChanged) {
      return;
    }
    window.api.setStoreValue('socketServer', socketServer);
    storedSocketServer = socketServer;
    socketInputHasChanged = false;
    window.api.reloadApp();
  };

  const promptConfirmation = () => {
    confirmModalOpen = true;
  };
</script>

{#if open}
  <Modal title="Confirm" bind:open={confirmModalOpen} autoclose>
    <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
      Changing the socket server to <span class="text-primary-600 font-bold">{socketServer}</span> will
      reload the app. If you're in a room, you'll need to reconnect afterward.
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
          bind:value={socketServer}
          oninput={onChange}
          placeholder="Socket Server"
          color={socketInputHasChanged ? 'amber' : 'default'}
          required
        />

        <Button
          color="primary"
          class="cursor-pointer"
          type="submit"
          disabled={!socketInputHasChanged}
          onclick={promptConfirmation}>Save</Button
        >
      </ButtonGroup>
    </Label>
  </div>
{/if}
