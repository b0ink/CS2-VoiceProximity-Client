import { type WebContents, app, ipcMain, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { type FileHandle, mkdir, open, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  RecordingManifest,
  RecordingSegment,
  RecordingStartRequest,
  RecordingStartResponse,
  RecordingStopResponse,
  RecordingTrackRequest,
} from '@shared/types/recording';

// Writes per-player WAV tracks for a recording session. The renderer sends PCM chunks addressed by
// frame offset on a timeline shared by every track; anything not covered by a chunk (player not
// connected) is written as silence, and every track is padded to the same length when the session
// stops. That keeps all files sample-aligned so they drop straight onto a video timeline.

const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const WAV_HEADER_BYTES = 44;
const MAX_WAV_DATA_BYTES = 0xffffffff - 36; // RIFF size field limit (~6h of 48kHz stereo)
const HEADER_REFRESH_MS = 5000; // Keep the header roughly current so a crash still leaves playable files
const SEGMENT_MERGE_GAP_SECONDS = 0.25;
const ZERO_BLOCK = Buffer.alloc(1024 * 1024);

interface TrackWriter {
  steamId: string;
  name: string | null;
  isLocal: boolean;
  channels: 1 | 2;
  blockAlign: number;
  filePath: string;
  handle?: FileHandle;
  queue: Promise<void>;
  framesWritten: number;
  segments: { startFrame: number; endFrame: number }[];
  lastHeaderWrite: number;
  failed: boolean;
}

interface Session {
  id: string;
  directory: string;
  request: RecordingStartRequest;
  tracks: Map<string, TrackWriter>;
  detachOwnerListeners: () => void;
  finalizing?: Promise<RecordingStopResponse>;
}

const activeSessions = new Map<string, Session>();
const finishedDirectories = new Map<string, string>();

const recordingsRoot = (): string => path.join(app.getPath('videos'), 'CS2 Proximity Chat');

const wavHeader = (sampleRate: number, channels: number, dataBytes: number): Buffer => {
  const header = Buffer.alloc(WAV_HEADER_BYTES);
  const blockAlign = channels * BYTES_PER_SAMPLE;
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataBytes, 40);
  return header;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const folderTimestamp = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_` +
  `${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}`;

const sanitizeFileName = (name: string): string => {
  const cleaned = Array.from(name)
    .filter((ch) => ch.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 48);
  return cleaned || 'player';
};

const isValidSteamId = (steamId: unknown): steamId is string =>
  typeof steamId === 'string' && /^[0-9]{1,20}$/.test(steamId);

const toBuffer = (data: unknown): Buffer | null => {
  if (data instanceof Uint8Array) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  return null;
};

const enqueue = (writer: TrackWriter, task: () => Promise<void>): void => {
  writer.queue = writer.queue
    .then(() => (writer.failed ? undefined : task()))
    .catch((error) => {
      writer.failed = true;
      console.error(`[Recording] Track ${writer.steamId} failed:`, error);
    });
};

const writeFully = async (handle: FileHandle, data: Buffer, position: number): Promise<void> => {
  let written = 0;
  while (written < data.byteLength) {
    const { bytesWritten } = await handle.write(
      data,
      written,
      data.byteLength - written,
      position + written,
    );
    written += bytesWritten;
  }
};

/** Appends PCM (whole frames) at the end of the track. Returns false once the WAV size limit is hit. */
const append = async (writer: TrackWriter, data: Buffer): Promise<boolean> => {
  const offsetBytes = writer.framesWritten * writer.blockAlign;
  if (offsetBytes + data.byteLength > MAX_WAV_DATA_BYTES) {
    return false;
  }
  await writeFully(writer.handle!, data, WAV_HEADER_BYTES + offsetBytes);
  writer.framesWritten += data.byteLength / writer.blockAlign;
  return true;
};

const appendSilence = async (writer: TrackWriter, frames: number): Promise<void> => {
  let remaining = frames * writer.blockAlign;
  while (remaining > 0) {
    const bytes = Math.min(remaining, ZERO_BLOCK.byteLength);
    if (!(await append(writer, ZERO_BLOCK.subarray(0, bytes)))) {
      return;
    }
    remaining -= bytes;
  }
};

const writeHeader = async (writer: TrackWriter, sampleRate: number): Promise<void> => {
  const header = wavHeader(sampleRate, writer.channels, writer.framesWritten * writer.blockAlign);
  await writeFully(writer.handle!, header, 0);
  writer.lastHeaderWrite = Date.now();
};

const writeChunk = async (
  session: Session,
  writer: TrackWriter,
  frameOffset: number,
  pcm: Buffer,
): Promise<void> => {
  let data = pcm;
  let offset = frameOffset;

  // Overlap with what's already on disk (e.g. a reconnect raced the old capture's last flush).
  if (offset < writer.framesWritten) {
    const overlapBytes = (writer.framesWritten - offset) * writer.blockAlign;
    if (overlapBytes >= data.byteLength) {
      return;
    }
    data = data.subarray(overlapBytes);
    offset = writer.framesWritten;
  }

  // Track which spans of the timeline actually had this player connected (for the manifest).
  const frames = data.byteLength / writer.blockAlign;
  const mergeGap = SEGMENT_MERGE_GAP_SECONDS * session.request.sampleRate;
  const last = writer.segments[writer.segments.length - 1];
  if (last && offset - last.endFrame <= mergeGap) {
    last.endFrame = offset + frames;
  } else {
    writer.segments.push({ startFrame: offset, endFrame: offset + frames });
  }

  if (offset > writer.framesWritten) {
    await appendSilence(writer, offset - writer.framesWritten);
  }
  if (!(await append(writer, data))) {
    console.warn(`[Recording] Track ${writer.steamId} reached the WAV size limit`);
    return;
  }

  if (Date.now() - writer.lastHeaderWrite > HEADER_REFRESH_MS) {
    await writeHeader(writer, session.request.sampleRate);
  }
};

const finalizeSession = (session: Session): Promise<RecordingStopResponse> => {
  if (session.finalizing) {
    return session.finalizing;
  }

  session.finalizing = (async (): Promise<RecordingStopResponse> => {
    const { sampleRate } = session.request;
    try {
      session.detachOwnerListeners();
      const writers = Array.from(session.tracks.values());
      await Promise.all(writers.map((writer) => writer.queue));

      // Every track ends where the longest one ends, so they all line up in an editor.
      const totalFrames = Math.max(0, ...writers.map((writer) => writer.framesWritten));
      const manifestTracks: RecordingManifest['tracks'] = [];

      for (const writer of writers) {
        if (!writer.handle) {
          continue; // File never opened.
        }
        try {
          if (writer.framesWritten < totalFrames) {
            await appendSilence(writer, totalFrames - writer.framesWritten);
          }
          await writeHeader(writer, sampleRate);
        } catch (error) {
          console.error(`[Recording] Failed to finalise track ${writer.steamId}:`, error);
        } finally {
          await writer.handle.close().catch(() => undefined);
        }

        const baseName = `${sanitizeFileName(writer.name ?? 'player')}_${writer.steamId}`;
        const finalPath = path.join(
          session.directory,
          `${baseName}${writer.isLocal ? '_mic' : ''}.wav`,
        );
        try {
          await rename(writer.filePath, finalPath);
          writer.filePath = finalPath;
        } catch (error) {
          console.warn(`[Recording] Could not rename ${writer.filePath}:`, error);
        }

        const segments: RecordingSegment[] = writer.segments.map((segment) => ({
          start: Number((segment.startFrame / sampleRate).toFixed(3)),
          end: Number((segment.endFrame / sampleRate).toFixed(3)),
        }));

        manifestTracks.push({
          file: path.basename(writer.filePath),
          steamId: writer.steamId,
          name: writer.name,
          isLocal: writer.isLocal,
          channels: writer.channels,
          segments,
        });
      }

      const durationSeconds = totalFrames / sampleRate;
      const manifest: RecordingManifest = {
        app: 'cs2-voice-proximity-client',
        clientVersion: session.request.clientVersion,
        roomCode: session.request.roomCode,
        startedAt: new Date(session.request.startedAt).toISOString(),
        stoppedAt: new Date(session.request.startedAt + durationSeconds * 1000).toISOString(),
        durationSeconds: Number(durationSeconds.toFixed(3)),
        sampleRate,
        bitDepth: BITS_PER_SAMPLE,
        outputLatencyMs: session.request.outputLatencyMs,
        tracks: manifestTracks,
      };
      await writeFile(
        path.join(session.directory, 'recording.json'),
        JSON.stringify(manifest, null, 2),
      ).catch((error) => console.error('[Recording] Failed to write manifest:', error));

      finishedDirectories.set(session.id, session.directory);
      console.log(
        `[Recording] Saved ${manifestTracks.length} tracks (${durationSeconds.toFixed(1)}s) to ${session.directory}`,
      );

      return {
        sessionId: session.id,
        directory: session.directory,
        trackCount: manifestTracks.length,
        durationSeconds,
      };
    } finally {
      activeSessions.delete(session.id);
    }
  })();

  return session.finalizing;
};

const createSessionDirectory = async (startedAt: number): Promise<string> => {
  const root = recordingsRoot();
  await mkdir(root, { recursive: true });
  const base = path.join(root, folderTimestamp(new Date(startedAt)));
  for (let attempt = 1; ; attempt++) {
    const directory = attempt === 1 ? base : `${base}_${attempt}`;
    try {
      await mkdir(directory);
      return directory;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || attempt >= 50) {
        throw error;
      }
    }
  }
};

/** Finalise the session if the renderer that owns it reloads, crashes or closes mid-recording. */
const watchOwner = (owner: WebContents, sessionId: string): (() => void) => {
  const onGone = (): void => {
    const session = activeSessions.get(sessionId);
    if (session) {
      void finalizeSession(session).catch((error) =>
        console.error('[Recording] Failed to finalise after renderer went away:', error),
      );
    }
  };
  owner.once('did-start-loading', onGone);
  owner.once('render-process-gone', onGone);
  owner.once('destroyed', onGone);
  return () => {
    owner.removeListener('did-start-loading', onGone);
    owner.removeListener('render-process-gone', onGone);
    owner.removeListener('destroyed', onGone);
  };
};

ipcMain.handle(
  'recording:start',
  async (event, request: RecordingStartRequest): Promise<RecordingStartResponse> => {
    const sampleRate = Math.round(Number(request?.sampleRate));
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
      throw new Error(`Invalid sample rate: ${request?.sampleRate}`);
    }
    const startedAt = Number.isFinite(request.startedAt) ? request.startedAt : Date.now();
    const directory = await createSessionDirectory(startedAt);
    const id = randomUUID();

    activeSessions.set(id, {
      id,
      directory,
      request: {
        sampleRate,
        startedAt,
        roomCode: String(request.roomCode ?? ''),
        outputLatencyMs: Number(request.outputLatencyMs) || 0,
        clientVersion: String(request.clientVersion ?? ''),
      },
      tracks: new Map(),
      detachOwnerListeners: watchOwner(event.sender, id),
    });

    console.log(`[Recording] Started session ${id} -> ${directory}`);
    return { sessionId: id, directory };
  },
);

// Registers the track synchronously so chunks sent right after (same IPC pipe, in order) find it.
ipcMain.on('recording:add-track', (_event, sessionId: string, track: RecordingTrackRequest) => {
  const session = activeSessions.get(sessionId);
  if (!session || session.finalizing || !isValidSteamId(track?.steamId)) {
    return;
  }
  if (session.tracks.has(track.steamId)) {
    return;
  }

  const channels = track.channels === 1 ? 1 : 2;
  const writer: TrackWriter = {
    steamId: track.steamId,
    name: typeof track.name === 'string' && track.name ? track.name : null,
    isLocal: track.isLocal === true,
    channels,
    blockAlign: channels * BYTES_PER_SAMPLE,
    filePath: path.join(session.directory, `${track.steamId}.wav`),
    queue: Promise.resolve(),
    framesWritten: 0,
    segments: [],
    lastHeaderWrite: 0,
    failed: false,
  };
  session.tracks.set(track.steamId, writer);

  enqueue(writer, async () => {
    writer.handle = await open(writer.filePath, 'w');
    await writeHeader(writer, session.request.sampleRate);
  });
});

ipcMain.on('recording:update-track-name', (_event, sessionId: string, steamId: string, name) => {
  const writer = activeSessions.get(sessionId)?.tracks.get(steamId);
  if (writer && typeof name === 'string' && name) {
    writer.name = name;
  }
});

ipcMain.on(
  'recording:chunk',
  (_event, sessionId: string, steamId: string, frameOffset: number, data: unknown) => {
    const session = activeSessions.get(sessionId);
    if (!session || session.finalizing) {
      return;
    }
    const writer = session.tracks.get(steamId);
    const pcm = toBuffer(data);
    if (!writer || writer.failed || !pcm || !Number.isSafeInteger(frameOffset) || frameOffset < 0) {
      return;
    }
    if (pcm.byteLength === 0 || pcm.byteLength % writer.blockAlign !== 0) {
      return;
    }
    // The renderer may reuse/transfer its buffer, so take a copy before going async.
    const copy = Buffer.from(pcm);
    enqueue(writer, () => writeChunk(session, writer, frameOffset, copy));
  },
);

ipcMain.handle('recording:stop', async (_event, sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Recording session not found');
  }
  return finalizeSession(session);
});

ipcMain.handle('recording:open-folder', async (_event, sessionId?: string) => {
  const directory =
    (sessionId &&
      (finishedDirectories.get(sessionId) ?? activeSessions.get(sessionId)?.directory)) ||
    recordingsRoot();
  await mkdir(directory, { recursive: true });
  const error = await shell.openPath(directory);
  if (error) {
    console.error(`[Recording] Failed to open ${directory}: ${error}`);
  }
});

// Don't let the app exit before every open recording has its headers written.
const QUIT_FINALIZE_TIMEOUT_MS = 15000;
let quitAfterFinalize = false;
app.on('before-quit', (event) => {
  if (activeSessions.size === 0 || quitAfterFinalize) {
    return;
  }
  event.preventDefault();
  quitAfterFinalize = true;
  Promise.race([
    Promise.allSettled(Array.from(activeSessions.values(), finalizeSession)),
    new Promise((resolve) => setTimeout(resolve, QUIT_FINALIZE_TIMEOUT_MS)),
  ]).finally(() => app.quit());
});
