import { writable } from 'svelte/store';
import type { RecordingStopResponse } from '@shared/types/recording';

// Records one WAV track per steamId while in a room.
//
// Remote players are captured from RemotePlayer.recordingOutput, i.e. after occlusion, distance,
// panning, reverb, mono/spectator switching and the user's volume slider — exactly what this client
// hears. The local microphone is captured raw (it's this player's own POV).
//
// Sync: each track is captured by an AudioWorklet that stamps chunks with the AudioContext sample
// frame. All tracks share that clock, so the main process can place every chunk at
// (frame - startFrame) and fill gaps (player not connected yet / disconnected) with silence.

const WORKLET_URL = 'worklets/track-recorder.js';
const WORKLET_NAME = 'track-recorder';
const STOP_FLUSH_TIMEOUT_MS = 1000;

export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'stopping';

export interface RecordingState {
  status: RecordingStatus;
  /** Epoch seconds when the current recording started. */
  startedAt: number | null;
  trackCount: number;
  lastRecording: RecordingStopResponse | null;
}

export const recordingState = writable<RecordingState>({
  status: 'idle',
  startedAt: null,
  trackCount: 0,
  lastRecording: null,
});

interface Tap {
  node: AudioWorkletNode;
  source: AudioNode;
  /** We created the source node (local mic) and must tear it down. */
  ownsSource: boolean;
  stopped: Promise<void>;
}

interface Track {
  steamId: string;
  isLocal: boolean;
  channels: 1 | 2;
  name?: string;
  tap?: Tap;
}

interface Session {
  id: string;
  context: AudioContext;
  /** AudioContext frame that maps to frame 0 of every track. */
  startFrame: number;
  /** Muted node connected to the destination so the render thread keeps pulling the worklets. */
  sink: GainNode;
  tracks: Map<string, Track>;
}

class SessionRecorder {
  private status: RecordingStatus = 'idle';
  private session?: Session;
  private workletModules = new WeakMap<BaseAudioContext, Promise<void>>();
  private nameResolver: (steamId: string) => string | undefined = () => undefined;

  // Sources that can be recorded, kept current whether or not a recording is running.
  private remoteOutputs = new Map<string, AudioNode>();
  private local?: { steamId: string; stream: MediaStream };

  get isActive(): boolean {
    return this.status !== 'idle';
  }

  setNameResolver(resolver: (steamId: string) => string | undefined): void {
    this.nameResolver = resolver;
  }

  setLocalStream(steamId: string, stream: MediaStream): void {
    this.local = { steamId, stream };
    if (this.session) {
      this.tapLocal(this.session);
    }
  }

  addRemotePlayer(steamId: string, output: AudioNode): void {
    this.remoteOutputs.set(steamId, output);
    if (this.session) {
      this.tap(this.session, steamId, output, { isLocal: false, channels: 2, ownsSource: false });
    }
  }

  removeRemotePlayer(steamId: string, output: AudioNode): void {
    if (this.remoteOutputs.get(steamId) !== output) {
      return; // A newer connection for this player already replaced it.
    }
    this.remoteOutputs.delete(steamId);
    const track = this.session?.tracks.get(steamId);
    if (track?.tap?.source === output) {
      void this.untap(track);
    }
  }

  /** Pick up player names that arrived after a track was created (names end up in the file names). */
  refreshNames(): void {
    const session = this.session;
    if (!session) {
      return;
    }
    for (const track of session.tracks.values()) {
      const name = this.nameResolver(track.steamId);
      if (name && name !== track.name) {
        track.name = name;
        window.api.recording.updateTrackName(session.id, track.steamId, name);
      }
    }
  }

  async start(context: AudioContext, roomCode: string): Promise<void> {
    if (this.status !== 'idle') {
      return;
    }
    this.setStatus('starting');

    let sessionId: string | undefined;
    try {
      if (context.state !== 'running') {
        await context.resume();
      }
      await this.loadWorklet(context);

      // Frame 0 of the shared timeline. Chunks rendered before it are trimmed; tracks whose audio
      // starts after it are padded with silence by the main process.
      const startFrame = Math.round(context.currentTime * context.sampleRate);
      const startedAt = Date.now();

      ({ sessionId } = await window.api.recording.start({
        sampleRate: context.sampleRate,
        roomCode,
        startedAt,
        outputLatencyMs: Math.round(
          ((context.baseLatency ?? 0) + (context.outputLatency ?? 0)) * 1000,
        ),
        clientVersion: window.api.clientVersion(),
      }));

      const sink = context.createGain();
      sink.gain.value = 0;
      sink.connect(context.destination);

      const session: Session = { id: sessionId, context, startFrame, sink, tracks: new Map() };
      this.session = session;
      this.status = 'recording';
      recordingState.update((s) => ({ ...s, status: 'recording', startedAt: startedAt / 1000 }));

      this.tapLocal(session);
      for (const [steamId, output] of this.remoteOutputs) {
        this.tap(session, steamId, output, { isLocal: false, channels: 2, ownsSource: false });
      }
    } catch (error) {
      if (this.session) {
        await this.stop().catch(() => undefined);
      } else {
        if (sessionId) {
          await window.api.recording.stop(sessionId).catch(() => undefined);
        }
        this.setStatus('idle');
      }
      throw error;
    }
  }

  async stop(): Promise<RecordingStopResponse | null> {
    const session = this.session;
    if (this.status !== 'recording' || !session) {
      return null;
    }
    this.setStatus('stopping');

    try {
      this.refreshNames();
      // Flush the last partial chunk of every track before the main process finalises the files.
      await Promise.all(Array.from(session.tracks.values(), (track) => this.untap(track)));
      const result = await window.api.recording.stop(session.id);
      recordingState.update((s) => ({ ...s, lastRecording: result }));
      return result;
    } finally {
      session.sink.disconnect();
      this.session = undefined;
      this.setStatus('idle');
    }
  }

  openFolder(sessionId?: string): void {
    window.api.recording.openFolder(sessionId);
  }

  private setStatus(status: RecordingStatus): void {
    this.status = status;
    recordingState.update((s) => ({
      ...s,
      status,
      ...(status === 'idle' || status === 'starting' ? { startedAt: null, trackCount: 0 } : {}),
    }));
  }

  private async loadWorklet(context: AudioContext): Promise<void> {
    let loading = this.workletModules.get(context);
    if (!loading) {
      loading = context.audioWorklet.addModule(WORKLET_URL).catch(async (error) => {
        // Fallback for environments where module fetches from the app's origin are refused.
        console.warn(
          `Recorder worklet failed to load from ${WORKLET_URL}, retrying via blob`,
          error,
        );
        const source = await (await fetch(WORKLET_URL)).text();
        const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        try {
          await context.audioWorklet.addModule(blobUrl);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      });
      loading.catch(() => this.workletModules.delete(context));
      this.workletModules.set(context, loading);
    }
    return loading;
  }

  private tapLocal(session: Session): void {
    if (!this.local || this.session !== session || this.status !== 'recording') {
      return;
    }
    const source = session.context.createMediaStreamSource(this.local.stream);
    this.tap(session, this.local.steamId, source, { isLocal: true, channels: 1, ownsSource: true });
  }

  private tap(
    session: Session,
    steamId: string,
    source: AudioNode,
    opts: { isLocal: boolean; channels: 1 | 2; ownsSource: boolean },
  ): void {
    if (this.session !== session || this.status !== 'recording') {
      return;
    }

    let track = session.tracks.get(steamId);
    if (!track) {
      track = {
        steamId,
        isLocal: opts.isLocal,
        channels: opts.channels,
        name: this.nameResolver(steamId),
      };
      session.tracks.set(steamId, track);
      window.api.recording.addTrack(session.id, {
        steamId,
        name: track.name,
        isLocal: track.isLocal,
        channels: track.channels,
      });
      recordingState.update((s) => ({ ...s, trackCount: session.tracks.size }));
    }

    if (track.tap) {
      if (track.tap.source === source) {
        return;
      }
      void this.untap(track); // Reconnected: retire the old capture, keep writing the same track.
    }

    const node = new AudioWorkletNode(session.context, WORKLET_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: track.channels,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      processorOptions: { channels: track.channels },
    });

    let markStopped!: () => void;
    const stopped = new Promise<void>((resolve) => (markStopped = resolve));
    const bytesPerFrame = track.channels * 2;

    node.port.onmessage = (event: MessageEvent): void => {
      const message = event.data;
      if (message?.type === 'chunk') {
        this.forwardChunk(session, steamId, bytesPerFrame, message.frame, message.pcm);
      } else if (message?.type === 'stopped') {
        markStopped();
      }
    };

    source.connect(node);
    node.connect(session.sink);
    track.tap = { node, source, ownsSource: opts.ownsSource, stopped };
  }

  private async untap(track: Track): Promise<void> {
    const tap = track.tap;
    if (!tap) {
      return;
    }
    track.tap = undefined;

    tap.node.port.postMessage('stop');
    await Promise.race([
      tap.stopped,
      new Promise<void>((resolve) => setTimeout(resolve, STOP_FLUSH_TIMEOUT_MS)),
    ]);

    try {
      tap.source.disconnect(tap.node);
    } catch {
      // Source was already torn down (e.g. RemotePlayer.disconnect()).
    }
    if (tap.ownsSource) {
      tap.source.disconnect();
    }
    tap.node.disconnect();
    tap.node.port.onmessage = null;
    tap.node.port.close();
  }

  private forwardChunk(
    session: Session,
    steamId: string,
    bytesPerFrame: number,
    frame: number,
    pcm: ArrayBuffer,
  ): void {
    let frameOffset = frame - session.startFrame;
    let data = new Uint8Array(pcm);

    if (frameOffset < 0) {
      // Rendered before the recording started.
      const skipBytes = -frameOffset * bytesPerFrame;
      if (skipBytes >= data.byteLength) {
        return;
      }
      data = data.slice(skipBytes);
      frameOffset = 0;
    }

    window.api.recording.writeChunk(session.id, steamId, frameOffset, data);
  }
}

export const sessionRecorder = new SessionRecorder();
