import { writable } from 'svelte/store';
import * as THREE from 'three';
import type { RemotePlayer } from '../RemotePlayer';

const fov = 60;
const aspect = 1920 / 1080;
const near = 1.0;
const far = 650.0;
export const clientCamera = writable<THREE.PerspectiveCamera>(
  new THREE.PerspectiveCamera(fov, aspect, near, far),
);

export const scene = writable<THREE.Scene>(new THREE.Scene());
export const threejs = writable<THREE.WebGLRenderer>(
  new THREE.WebGLRenderer({
    antialias: false,
  }),
);
export const clientListener = writable<THREE.AudioListener>(new THREE.AudioListener());
export const remotePlayers = writable<Map<string, RemotePlayer | undefined>>(new Map());
