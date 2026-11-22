// Minimal Node-style globals for bundled CommonJS dependencies.
//
// The renderer runs sandboxed with context isolation and no Node integration, so `global` and
// `process` don't exist. simple-peer's stream dependency (readable-stream@3) calls
// `process.nextTick`, and a few libraries probe `global`. `Buffer` is already bundled by the
// `buffer` package, so it isn't needed here.
//
// Loaded from index.html as its own module script *before* main.ts, so it runs before any
// dependency is evaluated. It's not imported from main.ts because the import sorter would
// move it below other imports.

interface NodeShimGlobals {
  global?: typeof globalThis;
  process?: {
    env: Record<string, string | undefined>;
    browser: boolean;
    nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]) => void;
  };
}

const shimTarget = globalThis as unknown as NodeShimGlobals;

shimTarget.global ??= globalThis;

shimTarget.process ??= {
  env: {},
  browser: true,
  nextTick: (callback, ...args) => queueMicrotask(() => callback(...args)),
};

export {};
