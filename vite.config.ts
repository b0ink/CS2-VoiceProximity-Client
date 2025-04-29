import type { UserConfig } from 'vite';

export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    outDir: 'disst/',
  },
  assetsInclude: ['**/*.glb'],
} satisfies UserConfig;
