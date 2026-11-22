/* eslint-disable @typescript-eslint/explicit-function-return-type */

// Plain JS served from public/ so the AudioWorklet can load it by URL in dev and packaged builds.
// Runs on the audio rendering thread. Captures whatever is connected to its input as interleaved
// 16-bit PCM and posts it to the main thread in chunks. Each chunk is stamped with the AudioContext
// sample frame it started at. Every track in a recording shares that clock, which keeps all tracks
// sample-aligned with each other even when players leave and rejoin mid-recording.

const DEFAULT_CHUNK_FRAMES = 8192; // ~170ms at 48kHz; must be a multiple of the 128-frame render quantum

function toInt16(sample) {
  const s = sample > 1 ? 1 : sample < -1 ? -1 : sample;
  return s < 0 ? s * 0x8000 : s * 0x7fff;
}

class TrackRecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.channels = opts.channels === 1 ? 1 : 2;
    this.chunkFrames = opts.chunkFrames || DEFAULT_CHUNK_FRAMES;
    this.pcm = new Int16Array(this.chunkFrames * this.channels);
    this.filled = 0;
    this.chunkStartFrame = -1;
    this.nextExpectedFrame = -1;
    this.stopped = false;

    this.port.onmessage = (event) => {
      if (event.data === 'stop' && !this.stopped) {
        this.flush();
        this.stopped = true;
        this.port.postMessage({ type: 'stopped' });
      }
    };
  }

  flush() {
    if (this.filled === 0) {
      return;
    }
    const samples = this.pcm.slice(0, this.filled * this.channels);
    this.port.postMessage({ type: 'chunk', frame: this.chunkStartFrame, pcm: samples.buffer }, [
      samples.buffer,
    ]);
    this.filled = 0;
    this.chunkStartFrame = -1;
  }

  process(inputs) {
    if (this.stopped) {
      return false;
    }

    const input = inputs[0] || [];
    const frames = input.length > 0 ? input[0].length : 128;

    // If the render thread skipped us for a few quanta, close the chunk so the main process places
    // the next one at its true position (the gap becomes silence instead of shifting the audio).
    if (this.nextExpectedFrame !== -1 && currentFrame !== this.nextExpectedFrame) {
      this.flush();
    }
    if (this.filled + frames > this.chunkFrames) {
      this.flush();
    }
    if (this.chunkStartFrame === -1) {
      this.chunkStartFrame = currentFrame;
    }

    const pcm = this.pcm;
    let offset = this.filled * this.channels;

    if (input.length === 0) {
      // Nothing connected right now: record silence.
      pcm.fill(0, offset, offset + frames * this.channels);
    } else if (this.channels === 1) {
      const mono = input[0];
      for (let i = 0; i < frames; i++) {
        pcm[offset++] = toInt16(mono[i]);
      }
    } else {
      const left = input[0];
      const right = input.length > 1 ? input[1] : left;
      for (let i = 0; i < frames; i++) {
        pcm[offset++] = toInt16(left[i]);
        pcm[offset++] = toInt16(right[i]);
      }
    }

    this.filled += frames;
    this.nextExpectedFrame = currentFrame + frames;
    return true;
  }
}

registerProcessor('track-recorder', TrackRecorderProcessor);
