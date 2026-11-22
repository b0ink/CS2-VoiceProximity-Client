<script lang="ts">
  import { CloseOutline, FolderOpenSolid } from 'flowbite-svelte-icons';
  import { currentTime } from '@store/appStore';
  import { recordingState, sessionRecorder } from '../recording/SessionRecorder';

  $: rec = $recordingState;
  $: elapsed = rec.startedAt ? Math.max(0, $currentTime - rec.startedAt) : 0;
  $: last = rec.lastRecording;

  let dismissedSessionId: string | null = null;

  const openLastRecording = (): void => {
    if (last) {
      sessionRecorder.openFolder(last.sessionId);
    }
  };

  const dismissLastRecording = (): void => {
    dismissedSessionId = last?.sessionId ?? null;
  };

  const formatDuration = (seconds: number): string => {
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return h > 0 ? `${h}:${mmss}` : mmss;
  };
</script>

{#if rec.status === 'recording'}
  <div
    class="pointer-events-none absolute left-1 top-1 z-5 flex items-center gap-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white"
  >
    <span class="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
    <span class="font-semibold">REC</span>
    <span class="tabular-nums">{formatDuration(elapsed)}</span>
    <span class="text-gray-400">· {rec.trackCount} {rec.trackCount === 1 ? 'track' : 'tracks'}</span
    >
  </div>
{:else if rec.status === 'starting' || rec.status === 'stopping'}
  <div
    class="pointer-events-none absolute left-1 top-1 z-5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-gray-300"
  >
    {rec.status === 'starting' ? 'Starting recording…' : 'Saving recording…'}
  </div>
{:else if last && last.sessionId !== dismissedSessionId}
  <div
    class="absolute left-1 top-1 z-5 flex items-center gap-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white"
  >
    <span class="text-green-400">
      Saved {last.trackCount}
      {last.trackCount === 1 ? 'track' : 'tracks'} · {formatDuration(last.durationSeconds)}
    </span>
    <button
      class="flex cursor-pointer items-center gap-0.5 text-primary-500 hover:text-primary-400"
      title="Open recording folder"
      onclick={openLastRecording}
    >
      <FolderOpenSolid size="xs" /> Open
    </button>
    <button
      class="cursor-pointer text-gray-400 hover:text-white"
      aria-label="Dismiss"
      onclick={dismissLastRecording}
    >
      <CloseOutline size="xs" />
    </button>
  </div>
{/if}
