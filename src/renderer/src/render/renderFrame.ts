import * as THREE from 'three';
import { OcclusionQuality } from '@shared/types/store/settings';
import settings from '@store/settings';
import { getMap } from './maps';

let occlusionAutoQuality: boolean;
let occlusionQuality: number;

settings.subscribe(($settings) => {
  occlusionAutoQuality = $settings.occlusionAutoQuality;
  occlusionQuality = $settings.occlusionQuality;
});

const occlusionUpdateTimes: number[] = [];
const DOWNGRADE_THRESHOLD = 60; // must be consistently above this to decrease occlusion detail
const UPGRADE_THRESHOLD = 30; // must be consistently below this to increase occlusion detail
const REQUIRED_GOOD_FRAMES = 100;
const REQUIRED_BAD_FRAMES = 1;
let goodFrameCount = 0;
let badFrameCount = 0;

let shouldUpdateSoundFilters: number = 0;

export function renderFrame(
  threejs: THREE.WebGLRenderer,
  scene: THREE.Scene,
  clientCamera: THREE.PerspectiveCamera | undefined,
  settingsOpen: boolean,
  updateSoundFilters: () => void,
): void {
  const start: number = performance.now();

  if (clientCamera) {
    threejs.render(scene, clientCamera);
  }

  // Reduce update rate if settings is open or occlusion quality is at very low
  // (Slightly increases latency when player walks out from behind a wall, but allows for a bigger buffer if computation is taking too long)
  const occlusionUpdateRate = settingsOpen || occlusionQuality === OcclusionQuality.VERYLOW ? 2 : 1;

  shouldUpdateSoundFilters++;

  if (
    getMap() &&
    // update sound filters at a reduced rate when settings is open to avoid laggy UI
    // otherwise update sound filters according to occlusionUpdateRate
    shouldUpdateSoundFilters % Math.floor(settingsOpen ? 2 : occlusionUpdateRate) === 0
  ) {
    shouldUpdateSoundFilters = 0;
    updateSoundFilters();

    // Track how long it takes to render each frame and calculate occlusion
    const frameTime: number = performance.now() - start;
    occlusionUpdateTimes.push(frameTime);
    if (occlusionUpdateTimes.length > 60) occlusionUpdateTimes.shift(); // keep last 60 samples

    const averageFrameTime = frameTime;
    console.log(averageFrameTime);
    // const averageFrameTime =
    // occlusionUpdateTimes.reduce((a, b) => a + b, 0) / occlusionUpdateTimes.length;

    if (occlusionAutoQuality) {
      if (averageFrameTime > DOWNGRADE_THRESHOLD) {
        badFrameCount++;
        goodFrameCount = 0;
      } else if (averageFrameTime < UPGRADE_THRESHOLD) {
        goodFrameCount++;
        badFrameCount = 0;
      } else {
        goodFrameCount = 0;
        badFrameCount = 0;
      }

      if (occlusionQuality === OcclusionQuality.OFF) {
        window.api.setSettingsValue('occlusionQuality', OcclusionQuality.VERYLOW);
      }

      if (badFrameCount >= REQUIRED_BAD_FRAMES && occlusionQuality > OcclusionQuality.VERYLOW) {
        const next: OcclusionQuality = Math.max(occlusionQuality - 1, OcclusionQuality.VERYLOW);
        window.api.setSettingsValue('occlusionQuality', next);
        badFrameCount = 0;
      }

      if (goodFrameCount >= REQUIRED_GOOD_FRAMES && occlusionQuality < OcclusionQuality.ULTRA) {
        const next: OcclusionQuality = Math.min(occlusionQuality + 1, OcclusionQuality.ULTRA);
        window.api.setSettingsValue('occlusionQuality', next);
        goodFrameCount = 0;
      }
    }
  }
}
