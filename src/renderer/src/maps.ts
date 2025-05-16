import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

// Available 3D .glb meshes of maps found in the static folder
// TODO: validate the mapList in the main process
// TODO: fetch mapList directly from the static folder, allows for custom maps to be downloaded into the folder and loaded into the app
const mapList = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_vertigo'];

const mapScale: number = 39.3701;

let map: THREE.Group<THREE.Object3DEventMap> | null = null;

interface MapData {
  scene: THREE.Scene;
  mapName: string;
}

async function initializeMap(
  mapData: MapData,
): Promise<THREE.Group<THREE.Object3DEventMap> | null> {
  if (!mapList.includes(mapData.mapName)) {
    console.log(`Failed to load map: '${mapData.mapName}'.glb could not be found.`);
    return null;
  }

  // Destroy any previously loaded maps, including its textures
  if (map && mapData.scene) {
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
    mapData.scene.remove(map);
    map = null;
  }

  console.log(`[GLTF] Fetching map blob (${mapData.mapName})`);

  const buffer = await window.api.loadMap(mapData.mapName);
  if (!buffer) {
    return null;
  }
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

    if (mapData.scene) {
      mapData.scene.add(map);
    }

    // We don't care about textures, but to help see the map, we assign each mesh a random color
    // However we want to re-use textures as much as possible to improve performance
    const materials: THREE.MeshBasicMaterial[] = Array.from({ length: 5 }, () => {
      const hue = Math.random() * 360;
      const pastel = new THREE.Color(`hsl(${hue}, 50%, 50%)`);
      // return new THREE.MeshBasicMaterial({ color: pastel, side: THREE.DoubleSide });
      return new THREE.MeshBasicMaterial({ color: pastel });
    });

    map.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = materials[Math.floor(Math.random() * materials.length)];
      }
    });

    console.log(`returning`, map);
    return map;
  } catch (e) {
    console.error(`Could not load GLB: ${e}`);
    return null;
  }
}

function getMap(): THREE.Group<THREE.Object3DEventMap> | null {
  return map;
}

export { initializeMap, mapList, getMap };
