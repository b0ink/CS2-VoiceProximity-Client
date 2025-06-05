import * as THREE from 'three';

// TODO: add mesh property in MapDoor
export interface MapDoor {
  label: string;
  rotateOffset: number;
  absOrigin: {
    x: number;
    y: number;
    z: number;
  };
  startingRotation: {
    x: number;
    y: number;
    z: number;
  };
  axis: {
    x: number;
    y: number;
    z: number;
  };
  size: {
    width: number;
    height: number;
  };
  offset: {
    x: number;
    y: number;
    z: number;
  };
}

// https://github.com/andigamesandmusic/Reverb.js
export type ImpulseResponseType =
  | 'AbernyteGrainSilo'
  | 'ArbroathAbbeySacristy'
  | 'Basement'
  | 'DomesticLivingRoom'
  | 'ElvedenHallLordsCloakroom'
  | 'ElvedenHallMarbleHall'
  | 'ElvedenHallSmokingRoom'
  | 'ElvedenHallVisitorsCloakroom'
  | 'EmptyApartmentBedroom'
  | 'ErrolBrickworksKiln'
  | 'FalklandPalaceRoyalTennisCourt'
  | 'HamiltonMausoleum'
  | 'InsidePiano'
  | 'KinoullAisle'
  | 'LadyChapelStAlbansCathedral'
  | 'MaesHowe'
  | 'MidiverbMark2Preset29'
  | 'PerthCityHallBalcony'
  | 'PurnodesRailroadTunnel'
  | 'R1NuclearReactorHall'
  | 'SaintLawrenceChurchMolenbeekWersbeekBelgium'
  | 'SampleBachCMinorPrelude'
  | 'SpokaneWomansClub'
  | 'SportsCentreUniversityOfYork'
  | 'StAndrewsChurch'
  | 'StMarysAbbeyReconstructionPhase1'
  | 'StMarysAbbeyReconstructionPhase2'
  | 'StMarysAbbeyReconstructionPhase3'
  | 'StPatricksChurchPatringtonPosition1'
  | 'StPatricksChurchPatringtonPosition2'
  | 'StPatricksChurchPatringtonPosition3'
  | 'StairwayUniversityOfYork'
  | 'TerrysFactoryWarehouse'
  | 'TerrysTypingRoom'
  | 'TyndallBruceMonument'
  | 'UndergroundCarPark'
  | 'YorkMinster';

export interface ReverbZone {
  label: string;
  strength: number;
  type: ImpulseResponseType;
  fadeDistance: number;
  fadeTime: number;
  vertices: {
    x: number;
    y: number;
    z: number;
  }[];
  mesh?: THREE.Mesh;
}
export interface MapData {
  buffer: Buffer<ArrayBufferLike>;
  doors: MapDoor[] | null;
  reverbZones: ReverbZone[] | null;
}
