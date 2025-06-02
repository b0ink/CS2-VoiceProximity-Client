<script lang="ts">
  const versions = window.electron.process.versions;
  let verbose: boolean = false;
</script>

<ul class="versions">
  {#if verbose}
    <li class="electron-version">Electron <span class="opacity-50">v{versions.electron}</span></li>
    <li class="chrome-version">Chromium <span class="opacity-50">v{versions.chrome}</span></li>
    <li class="node-version">Node <span class="opacity-50">v{versions.node}</span></li>
  {/if}
  <br />
  <li class="node-version">
    <button
      class="opacity-50"
      on:click={() => {
        verbose = !verbose;
      }}>v{window.api.clientVersion()}</button
    >
  </li>
</ul>
