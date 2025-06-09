import * as THREE from 'three';
import {
  MeshBVH,
  acceleratedRaycast,
  computeBatchedBoundsTree,
  computeBoundsTree,
  disposeBatchedBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import { ConvexGeometry, GLTFLoader } from 'three-stdlib';
import type { MapData, MapDoor, ReverbZone } from '@shared/types/maps';
import { transformVector } from '../lib/vector';

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
THREE.BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;

// Available 3D .glb meshes of maps found in the static folder
// TODO: validate the mapList in the main process
// TODO: fetch mapList directly from the static folder, allows for custom maps to be downloaded into the folder and loaded into the app
export const mapList = [
  'de_dust2',
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_vertigo',
  'de_anubis',
];

const mapScale: number = 39.3701;

let map: THREE.Group<THREE.Object3DEventMap> | null = null;

let mapDoors: MapDoor[] = [];
let mapDoorMeshes: THREE.Group[] = [];

// let mapReverbZones: ReverbZone[] = [];
// let mapReverbZonesMeshes: THREE.Mesh[] = [];

let mapData: MapData | null = null;

export async function initializeMap(
  scene: THREE.Scene,
  mapName: string,
): Promise<THREE.Group<THREE.Object3DEventMap> | null> {
  if (!mapList.includes(mapName)) {
    console.log(`Failed to load map: '${mapName}'.glb could not be found.`);
    return null;
  }

  // Destroy any previously loaded maps, including its textures
  if (map && scene) {
    map.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.isMesh) {
          // console.log('disposing old mesh');
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    scene.remove(map);
    map = null;
  }

  // Destroy any previously loaded doors, including its textures
  for (const group of mapDoorMeshes) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    scene.remove(group);
  }

  if (mapData?.reverbZones) {
    for (const zone of mapData.reverbZones) {
      if (zone.mesh) {
        scene.remove(zone.mesh);
        zone.mesh.geometry.dispose();
        zone.mesh = undefined;
      }
      zone.box = undefined;
    }
  }

  mapDoorMeshes = [];
  mapDoors = [];

  console.log(`[GLTF] Fetching map blob (${mapName})`);

  mapData = await window.api.loadMap(mapName);
  const { buffer, doors: doorData, reverbZones: reverbZonesData } = mapData;

  console.log(mapData);
  if (!buffer) {
    return null;
  }
  if (
    doorData === null ||
    !Array.isArray(doorData) ||
    reverbZonesData === null ||
    !Array.isArray(reverbZonesData)
  ) {
    console.error(
      `Failed to parse map data from "${mapName}.json". Please check for syntax errors or invalid JSON format.`,
    );
  }
  const doors = doorData ? doorData : [];
  const reverbZones = reverbZonesData ? reverbZonesData : [];
  console.log(reverbZonesData);

  const blob = new Blob([buffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);

  console.log('[GLTF] Fetched map. Loading into ThreeJS...');

  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(url);
    console.log('[GLTF] Loaded into ThreeJS!');
    map = gltf.scene;
    map.scale.set(mapScale, mapScale, mapScale);
    map.rotation.x = -Math.PI / 2;

    if (scene) {
      scene.add(map);
    }

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

    map.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = materials[Math.floor(Math.random() * materials.length)];
        child.geometry.computeBoundsTree({ lazyGeneration: false });
      }
    });

    for (const door of doors) {
      const { group: doorGroup } = createDoor(door, 0x00ff00);
      scene.add(doorGroup);
      mapDoorMeshes.push(doorGroup);
    }

    for (const reverbZone of reverbZones) {
      const zoneMesh = createReverbZoneGeometry(reverbZone);
      reverbZone.mesh = zoneMesh;
      const bvh = new MeshBVH(reverbZone.mesh.geometry);
      reverbZone.mesh.geometry.boundsTree = bvh;
      const box = new THREE.Box3().setFromObject(zoneMesh);
      reverbZone.box = box;
      scene.add(zoneMesh);
    }

    console.log(reverbZones);
    mapDoors = [...doors];
    // mapReverbZones = [...reverbZones];

    console.log(`returning`, map);
    return map;
  } catch (e) {
    console.error(`Could not load GLB: ${e}`);
    return null;
  }
}

function createReverbZoneGeometry(zone: ReverbZone): THREE.Mesh {
  const vectors = zone.vertices.map((z) => transformVector(z));
  const zoneGeometry = new ConvexGeometry(vectors);
  const zoneMesh = new THREE.Mesh(zoneGeometry, new THREE.MeshBasicMaterial({ wireframe: true }));
  return zoneMesh;
}

function createDoor(
  door: MapDoor,
  color: number = 0x00ff00,
): { group: THREE.Group; mesh: THREE.Mesh } {
  const geometry = new THREE.PlaneGeometry(door.size.width, door.size.height);
  geometry.translate(door.size.width / 2, door.size.height / 2, 0);
  const offset = transformVector(new THREE.Vector3(door.offset.x, door.offset.y, door.offset.z));
  geometry.translate(offset.x, offset.y, offset.z);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  );
  const group = new THREE.Group();
  group.add(mesh);
  group.position.copy(transformVector(door.absOrigin));
  mesh.position.set(0, 0, 0);
  group.rotation.y = THREE.MathUtils.degToRad(door.startingRotation.y);
  return { group, mesh };
}

export function flipDoor(origin: THREE.Vector3, rotation: number): void {
  const transformed = transformVector(origin);

  const doorMesh = mapDoorMeshes.find(
    (d) =>
      Math.floor(d.position.x) === Math.floor(transformed.x) &&
      Math.floor(d.position.y) === Math.floor(transformed.y) &&
      Math.floor(d.position.z) === Math.floor(transformed.z),
  );

  const doorData = mapDoors.find(
    (d) =>
      Math.floor(d.absOrigin.x) === Math.floor(origin.x) &&
      Math.floor(d.absOrigin.y) === Math.floor(origin.y) &&
      Math.floor(d.absOrigin.z) === Math.floor(origin.z),
  );

  if (doorMesh && doorData) {
    setDoorAngle(doorMesh, rotation, doorData.rotateOffset);
  } else {
    console.error(`Couldnt find door mesh or data: ${doorMesh} ${doorData}`);
  }
}

function setDoorAngle(group: THREE.Group, degrees: number, offset: number): void {
  if (degrees === 999) {
    // Server will emit 999 to either refresh positions (on round start) or indicate door has been destroyed
    group.visible = false;
    return;
  }

  group.visible = true;

  const radians = THREE.MathUtils.degToRad(degrees + offset);
  group.rotation.y = radians;
}

export function getMapDoors(): THREE.Group[] {
  return mapDoorMeshes;
}

export function getReverbZones(): ReverbZone[] | undefined | null {
  return mapData?.reverbZones;
}

export function getMap(): THREE.Group<THREE.Object3DEventMap> | null {
  return map;
}
