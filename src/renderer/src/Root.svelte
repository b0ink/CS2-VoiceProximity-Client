<script lang="ts">
  import Notifications from 'svelte-notifications';
  import App from './App.svelte';
  import TitleBar from './components/TitleBar.svelte';
</script>

<Notifications zIndex="100" class="default-notification-style">
  <TitleBar />
  <App />
</Notifications>
