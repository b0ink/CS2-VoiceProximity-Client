/* eslint-disable @typescript-eslint/naming-convention */
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import path from 'path';
import { BuildEnvironmentOptions } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

const defaultBuildOptions: BuildEnvironmentOptions | undefined = {
  minify: 'terser',
  terserOptions: {
    compress: true,
  },
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { ...defaultBuildOptions },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { ...defaultBuildOptions },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
  },
  renderer: {
    plugins: [svelte(), tailwindcss()],
    assetsInclude: ['**/*.glb'], // Add .glb files to the assetsInclude
    build: { ...defaultBuildOptions },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@store': path.resolve(__dirname, 'src/renderer/src/store'),
      },
    },
  },
});
