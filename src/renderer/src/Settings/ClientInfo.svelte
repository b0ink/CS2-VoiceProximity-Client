<script lang="ts">
  import store from '@store/client';
  import settings from '@store/settings';
  import Versions from './Versions.svelte';

  $: socketUrl = $settings.socketServer;
  $: clientSteamId = $store.steamId;
</script>

<div class="bottom-1 left-0 right-0 text-xs text-center text-white opacity-50">
  <div>
    Socket URL: <span class="opacity-50">{socketUrl || 'N/A'}</span>
  </div>
  <div>
    Steam ID: <span class="opacity-50">{clientSteamId || 'N/A'}</span>
  </div>
  <br />
  <div>
    <Versions />
  </div>
</div>
