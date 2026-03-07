import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { ConvexGeometry } from 'three-stdlib';
import type { MapData, ReverbZone } from '@shared/types/maps';
import { transformVector } from '../lib/vector';

let mapData: MapData | null = null;

export async function initializeMap(scene: THREE.Scene, mapName: string): Promise<void> {
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

  mapData = await window.api.loadMap(mapName);
  const { reverbZones: reverbZonesData } = mapData;

  const reverbZones = reverbZonesData ? reverbZonesData : [];

  for (const reverbZone of reverbZones) {
    const zoneMesh = createReverbZoneGeometry(reverbZone);
    reverbZone.mesh = zoneMesh;
    const bvh = new MeshBVH(reverbZone.mesh.geometry);
    reverbZone.mesh.geometry.boundsTree = bvh;
    const box = new THREE.Box3().setFromObject(zoneMesh);
    reverbZone.box = box;
    scene.add(zoneMesh);
  }
}

function createReverbZoneGeometry(zone: ReverbZone): THREE.Mesh {
  const vectors = zone.vertices.map((z) => transformVector(z));
  const zoneGeometry = new ConvexGeometry(vectors);
  const zoneMesh = new THREE.Mesh(zoneGeometry, new THREE.MeshBasicMaterial({ wireframe: true }));
  return zoneMesh;
}

export function getReverbZones(): ReverbZone[] | undefined | null {
  return mapData?.reverbZones;
}
