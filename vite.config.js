import { defineConfig } from 'vite';
export default defineConfig({
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'readable-stream',
    },
  },
  optimizeDeps: {
    include: ['crypto-browserify', 'stream', 'readable-stream', 'randombytes'],
  },
});
