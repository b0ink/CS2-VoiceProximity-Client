import type { UserConfig } from 'vite';

export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    outDir: 'dist/',
  },
} satisfies UserConfig;
