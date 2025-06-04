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

export interface MapData {
  buffer: Buffer<ArrayBufferLike>;
  doors: MapDoor[] | null;
}
