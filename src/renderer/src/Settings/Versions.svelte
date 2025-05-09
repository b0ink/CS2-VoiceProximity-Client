<script lang="ts">
  const versions = window.electron.process.versions;
</script>

<ul class="versions">
  <li class="electron-version">Electron <span class="opacity-50">v{versions.electron}</span></li>
  <li class="chrome-version">Chromium <span class="opacity-50">v{versions.chrome}</span></li>
  <li class="node-version">Node <span class="opacity-50">v{versions.node}</span></li>
</ul>
