import * as THREE from 'three';

// Transform Source2 coordinate (Z is up/down) to Three.js (Y is up/down)
// Keeping in mind that we've also rotated our map on the X axis - but only Y & Z need transforming
// NOTE: .glb blender exports must have the "+Y up" option DISABLED
export function transformVector(input: THREE.Vector3 | THREE.Vector3Like): THREE.Vector3 {
  return new THREE.Vector3(input.x, input.z, input.y * -1);
}
