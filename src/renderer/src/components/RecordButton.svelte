<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { StopSolid } from 'flowbite-svelte-icons';
  import { getNotificationsContext } from 'svelte-notifications';
  import { roomCode } from '@store/playerStore';
  import { clientListener } from '@store/threeStore';
  import { cn } from '../lib/tailwind';
  import { recordingState, sessionRecorder } from '../recording/SessionRecorder';

  const { addNotification } = getNotificationsContext();

  $: status = $recordingState.status;
  $: busy = status === 'starting' || status === 'stopping';
  $: recording = status === 'recording' || status === 'stopping';

  const toggleRecording = async (): Promise<void> => {
    try {
      if (status === 'idle') {
        await sessionRecorder.start($clientListener.context, $roomCode);
      } else if (status === 'recording') {
        await sessionRecorder.stop();
      }
    } catch (error) {
      console.error('Recording failed', error);
      addNotification({
        text: `Recording failed: ${error instanceof Error ? error.message : String(error)}`,
        position: 'top-center',
        removeAfter: 5000,
        type: 'error',
      });
    }
  };
</script>

<Button
  color="alternative"
  class={cn('px-3', busy ? 'cursor-wait' : 'cursor-pointer')}
  title={recording ? 'Stop recording' : 'Record every player as a separate track'}
  aria-label={recording ? 'Stop recording' : 'Start recording'}
  disabled={busy}
  onclick={toggleRecording}
>
  {#if recording}
    <StopSolid color="#ef4444" class={cn(status === 'recording' && 'animate-pulse')} />
  {:else}
    <span class="block h-3.5 w-3.5 rounded-full bg-red-500"></span>
  {/if}
</Button>
