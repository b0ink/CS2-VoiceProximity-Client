<script lang="ts">
  export let clientSteamId;
  export let socketUrl;
</script>

<div class="bottom-1 left-0 right-0 text-xs text-center text-white">
  <div class="opacity-50">
    Socket URL: <span class="opacity-50">{socketUrl || 'N/A'}</span>
  </div>
  <div class="opacity-50">
    Steam ID: <span class="opacity-50">{clientSteamId || 'N/A'}</span>
  </div>
</div>
