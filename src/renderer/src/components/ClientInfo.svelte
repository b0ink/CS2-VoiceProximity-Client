<script lang="ts">
  import { Button } from 'flowbite-svelte';

  export let clientSteamId;
  export let socketUrl;
</script>

<div style="position: absolute; bottom: 5px; font-size: 12px" class="text-center">
  <div style="opacity:50%">
    Socket URL: <span style="opacity:50%;">{socketUrl || 'N/A'}</span>
  </div>
  <div style="opacity:50%" class="">
    Steam ID: <span style="opacity:50%;">{clientSteamId || 'N/A'}</span>
    {#if clientSteamId}
      <Button
        class="text-decoration-line cursor"
        onclick={async () => {
          await window.api.setStoreValue('steamId', null);
          await window.api.setStoreValue('token', null);
          window.api.reloadApp();
        }}>Sign Out</Button
      >
    {/if}
  </div>
</div>
