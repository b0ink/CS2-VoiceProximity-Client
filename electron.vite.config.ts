import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { BuildEnvironmentOptions } from 'vite';

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
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { ...defaultBuildOptions },
  },
  renderer: {
    plugins: [svelte(), tailwindcss()],
    assetsInclude: ['**/*.glb'], // Add .glb files to the assetsInclude
    build: { ...defaultBuildOptions },
  },
});
