import * as THREE from 'three';

export function renderFrame(
  threejs: THREE.WebGLRenderer,
  scene: THREE.Scene,
  clientCamera: THREE.PerspectiveCamera | undefined,
  updateSoundFilters: () => void,
): void {
  if (clientCamera) {
    threejs.render(scene, clientCamera);
  }

  updateSoundFilters();
}
