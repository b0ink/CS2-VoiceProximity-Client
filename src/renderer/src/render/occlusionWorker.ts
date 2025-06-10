// self: DedicatedWorkerGlobalScope
import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBatchedBoundsTree,
  computeBoundsTree,
  disposeBatchedBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import { OcclusionQuality } from '@shared/types/store/settings';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
THREE.BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;

let mapMesh: THREE.Group<THREE.Object3DEventMap>;
const mapScale: number = 39.3701;

self.onmessage = (e) => {
  const message = JSON.parse(e.data);
  if (message.type && message.type === 'init') {
    // mapMesh = JSON.parse(e.data.map);
    // mapMesh = message.map;

    // TODO: we should be able to have a map init file we can share between App.svelte and this worker

    const loader = new THREE.ObjectLoader();
    const parsed = loader.parse(message.map);
    mapMesh = parsed as THREE.Group<THREE.Object3DEventMap>;
    mapMesh.scale.set(mapScale, mapScale, mapScale);
    mapMesh.rotation.x = -Math.PI / 2;
    mapMesh.updateMatrixWorld(true);
    // We don't care about textures, but to help see the map, we assign each mesh a random color
    // However we want to re-use textures as much as possible to improve performance
    const hexColors = [
      '#77A1E0',
      '#6184B8',
      '#4C678F',
      '#364966',
      '#28354a',
      // '#1E2838',
    ];
    const materials: THREE.MeshBasicMaterial[] = Array.from({ length: 5 }, () => {
      const color = hexColors[Math.floor(Math.random() * hexColors.length)];
      return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    });

    mapMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = materials[Math.floor(Math.random() * materials.length)];
        child.geometry.computeBoundsTree({ lazyGeneration: false });
      }
    });
    console.log(mapMesh);
    return;
  }

  //   const occlusionMesh = e.data.occlusionMesh as THREE.Group<THREE.Object3DEventMap>[];
  //TODO: get door data
  const occlusionMesh = [mapMesh];
  //   const clientPosition = e.data.clientPosition as THREE.Vector3;
  //   const playerPosition = e.data.playerPosition as THREE.Vector3;

  const clientPosition = new THREE.Vector3(
    message.clientPosition.x,
    message.clientPosition.y,
    message.clientPosition.z,
  );
  const playerPosition = new THREE.Vector3(
    message.playerPosition.x,
    message.playerPosition.y,
    message.playerPosition.z,
  );
  const occlusionQuality = message.occlusionQuality as OcclusionQuality;
  const steamId = message.steamId as string;

  if (!clientPosition || !playerPosition) {
    return {
      steamId,
      occlusion: 0,
      totalExtraHits: 0,
    };
  }

  if (occlusionQuality == OcclusionQuality.OFF) {
    return {
      steamId,
      occlusion: 0,
      totalExtraHits: 0,
    };
  }

  // const start: number = performance.now();

  const distance = calculateDistance(clientPosition, playerPosition);

  // Ensure our widening isnt bigger than our playermodel (64; 32 from middle), otherwise itll pass through walls
  const SndOcclusonWidening = 31;

  const SoundLeft = calculatePoint(playerPosition, clientPosition, SndOcclusonWidening, true);
  const SoundRight = calculatePoint(playerPosition, clientPosition, SndOcclusonWidening, false);

  const ListenerLeft = calculatePoint(clientPosition, playerPosition, SndOcclusonWidening, true);
  const ListenerRight = calculatePoint(clientPosition, playerPosition, SndOcclusonWidening, false);

  const lines: number[] = [];

  if (occlusionQuality >= OcclusionQuality.LOW) {
    lines.push(didIntersect(occlusionMesh, playerPosition, clientPosition));
  }

  if (occlusionQuality >= OcclusionQuality.MEDIUM) {
    lines.push(didIntersect(occlusionMesh, SoundLeft, ListenerLeft));
    lines.push(didIntersect(occlusionMesh, SoundLeft, clientPosition));
    lines.push(didIntersect(occlusionMesh, SoundRight, clientPosition));
    lines.push(didIntersect(occlusionMesh, SoundRight, ListenerRight));
  }

  // Not reccommended on maps with high mesh/face count, unless occlusionUpdateRate has a larger value (less frequent updates)
  if (occlusionQuality >= OcclusionQuality.HIGH) {
    lines.push(didIntersect(occlusionMesh, SoundLeft, ListenerRight));
    lines.push(didIntersect(occlusionMesh, playerPosition, ListenerLeft));
    lines.push(didIntersect(occlusionMesh, playerPosition, ListenerRight));
    lines.push(didIntersect(occlusionMesh, SoundRight, ListenerLeft));
  }

  let hits = 0;
  for (const line of lines) {
    if (line >= 1) {
      hits += 1;
    }
  }
  if (hits > 0) {
    // console.log(`${hits} / 11 got hit. these equals to ${hits / 11}. setting filter to ${11000 - (hits / 11) * 11000}`);
  }

  let occlusionRatio = hits / lines.length;
  let totalExtraHits = 0;

  if (occlusionRatio === 1) {
    // Check how many extra hits occurred (i.e. walls behind walls)
    for (const line of lines) {
      if (line > 1) {
        totalExtraHits += line - 1;
      }
    }
    const extraDampening = THREE.MathUtils.clamp(totalExtraHits / lines.length, 0, 1);
    // Blend between normal full occlusion and extreme occlusion
    // 1 => 100% occluded, 2 => extra occluded (more walls)
    occlusionRatio += extraDampening; // could also weight this if needed
  }

  // const duration: number = performance.now() - start;
  // console.log(`duration ${duration}`);

  self.postMessage({
    distance: distance,
    steamId: steamId,
    occlusion: hits / lines.length,
    totalExtraHits: totalExtraHits,
  });
};

const didIntersect = (
  occlusionMesh: THREE.Group<THREE.Object3DEventMap>[],
  v1: THREE.Vector3,
  v2: THREE.Vector3,
): number => {
  if (occlusionMesh == null) {
    return 0;
  }

  const raycaster = new THREE.Raycaster();

  const dir = v2.clone().sub(v1).normalize();
  raycaster.set(v1, dir);
  raycaster.firstHitOnly = true;

  const hits: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[] = [];
  for (const mesh of occlusionMesh) {
    if (!mesh.visible) {
      // Skip destroyed doors
      continue;
    }

    // hits = hits +  raycaster.intersectObject(mesh, true);
    const hit = raycaster.intersectObject(mesh, true);
    hits.push(...hit);
  }
  // const hits = raycaster.intersectObject(occlusionMesh, true);
  const maxDistance = v1.distanceTo(v2);
  const filteredHits = hits.filter((hit) => hit.distance <= maxDistance);
  // return hits.length;
  // const hits = raycaster.intersectObject(occlusionMesh, true);

  // console.log(`Ray hit ${filteredHits.length} objects`);

  // filteredHits.forEach((hit) => {
  //   // console.log(`Hit ${i}: Distance = ${hit.distance.toFixed(2)}, Object = ${hit.object.name}`);

  //   // Calculate the size of the mesh
  //   // TODO: we can use this in the future if our walls have thickness, and we can scale our occlusion with the 3d volume of the wall
  //   if (hit.object instanceof THREE.Mesh) {
  //     const object = hit.object as THREE.Mesh;
  //     object.geometry.computeBoundingBox();
  //     const box = object.geometry.boundingBox;
  //     const size = new THREE.Vector3();
  //     if (box) {
  //       box.getSize(size);
  //       // console.log("Mesh size:", size);
  //     }
  //   }
  // });

  return filteredHits.length;
};

const calculatePoint = (
  a: THREE.Vector3,
  b: THREE.Vector3,
  m: number,
  posOrneg: boolean,
): THREE.Vector3 => {
  const n = new THREE.Vector3(a.x, 0, a.z).distanceTo(new THREE.Vector3(b.x, 0, b.z));
  const mn = m / n;
  let x, z;

  if (posOrneg) {
    x = a.x + mn * (a.z - b.z);
    z = a.z - mn * (a.x - b.x);
  } else {
    x = a.x - mn * (a.z - b.z);
    z = a.z + mn * (a.x - b.x);
  }

  return new THREE.Vector3(x, a.y, z);
};

const calculateDistance = (a?: THREE.Vector3, b?: THREE.Vector3): number | null => {
  if (a && b) {
    return a.distanceTo(b);
  }
  return null;
};
