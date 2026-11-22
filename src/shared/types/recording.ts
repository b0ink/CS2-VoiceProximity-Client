// IPC contract between the renderer (which captures audio) and the main process (which writes WAV files).
// Every track in a session shares one timeline: sample frame 0 is the moment recording started, and
// chunks are addressed by frame offset on that timeline. Gaps (player not connected) are written as silence.

export interface RecordingStartRequest {
  sampleRate: number;
  roomCode: string;
  /** Wall-clock time (epoch ms) of frame 0 on the shared timeline. */
  startedAt: number;
  /** How far the speakers lag behind the captured audio, in ms (AudioContext base + output latency). */
  outputLatencyMs: number;
  clientVersion: string;
}

export interface RecordingStartResponse {
  sessionId: string;
  directory: string;
}

export interface RecordingTrackRequest {
  steamId: string;
  name?: string;
  /** The recording user's own microphone (raw, no spatial effects). */
  isLocal: boolean;
  channels: 1 | 2;
}

export interface RecordingSegment {
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
}

export interface RecordingManifestTrack {
  file: string;
  steamId: string;
  name: string | null;
  isLocal: boolean;
  channels: 1 | 2;
  /** Spans of the timeline where this player was connected; everything else is silence. */
  segments: RecordingSegment[];
}

export interface RecordingManifest {
  app: string;
  clientVersion: string;
  roomCode: string;
  startedAt: string;
  stoppedAt: string;
  durationSeconds: number;
  sampleRate: number;
  bitDepth: number;
  outputLatencyMs: number;
  tracks: RecordingManifestTrack[];
}

export interface RecordingStopResponse {
  sessionId: string;
  directory: string;
  trackCount: number;
  durationSeconds: number;
}
