import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

// Available 3D .glb meshes of maps found in the static folder
// TODO: validate the mapList in the main process
// TODO: fetch mapList directly from the static folder, allows for custom maps to be downloaded into the folder and loaded into the app
const mapList = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_vertigo'];

const mapScale: number = 39.3701;

interface MapData {
  map: THREE.Group<THREE.Object3DEventMap> | undefined;
  scene: THREE.Scene;
  mapName: string;
}
async function initializeMap(mapData: MapData) {
  // Destroy any previously loaded maps, including its textures

  if (!mapList.includes(mapData.mapName)) {
    console.log(`Failed to load map: '${mapData.mapName}'.glb could not be found.`);
    return;
  }

  if (mapData.map && mapData.scene) {
    mapData.map.traverse((child) => {
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
    mapData.scene.remove(mapData.map);
    mapData.map = null;
  }

  console.log(`[GLTF] Fetching map blob (${mapData.mapName})`);

  const buffer = await window.api.loadMap(mapData.mapName);
  const blob = new Blob([buffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);

  console.log('[GLTF] Fetched map. Loading into ThreeJS...');

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      console.log('[GLTF] Loaded into ThreeJS!');
      mapData.map = gltf.scene;
      mapData.map.scale.set(mapScale, mapScale, mapScale);
      mapData.map.rotation.x = -Math.PI / 2;

      if (mapData.scene) {
        mapData.scene.add(mapData.map);
      }

      // We don't care about textures, but to help see the map, we assign each mesh a random color
      // However we want to re-use textures as much as possible to improve performance
      const materials: THREE.MeshBasicMaterial[] = Array.from({ length: 5 }, () => {
        const hue = Math.random() * 360;
        const pastel = new THREE.Color(`hsl(${hue}, 50%, 50%)`);
        // return new THREE.MeshBasicMaterial({ color: pastel, side: THREE.DoubleSide });
        return new THREE.MeshBasicMaterial({ color: pastel });
      });

      mapData.map.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = materials[Math.floor(Math.random() * materials.length)];
        }
      });
    },
    undefined,
    (err) => {
      console.error('Failed to load GLB:', err);
    },
  );
}

export { initializeMap, mapList };
