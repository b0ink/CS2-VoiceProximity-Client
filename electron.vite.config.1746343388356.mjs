// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [svelte()],
    assetsInclude: ["**/*.glb"]
    // Add .glb files to the assetsInclude
  }
});
export {
  electron_vite_config_default as default
};
