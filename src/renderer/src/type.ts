import Peer from 'simple-peer';

export enum CsTeam {
  None = 0,
  Spectator = 1,
  Terrorist = 2,
  CounterTerrorist = 3,
}

export interface Client {
  steamId: string;
  clientId: string; // this would have to be unique to the players PC?
}

export interface SocketClientMap {
  [socketId: string]: Client;
}

export interface SteamIdSocketMap {
  [steamId: string]: string;
}

export interface PeerConnections {
  [peer: string]: Peer.Instance;
}

export interface PlayerPositionApiData {
  SteamId?: string;
  Name?: string;
  OriginX?: number;
  OriginY?: number;
  OriginZ?: number;
  LookAtX?: number;
  LookAtY?: number;
  LookAtZ?: number;
  IsAlive?: boolean;
  Team?: CsTeam;
}

export interface AudioConnectionStuff {
  // socket? typeof Socket;
  stream?: MediaStream;
  instream?: MediaStream;
  // microphoneGain?: GainNode;
  // audioListener?: VadNode;
  muted: boolean;
  deafened: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

// interface AudioNodes {
//   dummyAudioElement: HTMLAudioElement;
//   audioElement: HTMLAudioElement;
//   // gain: GainNode;
//   // pan: PannerNode;
//   // reverb: ConvolverNode;
//   // muffle: BiquadFilterNode;
//   destination: AudioNode;
//   // reverbConnected: boolean;
//   // muffleConnected: boolean;
// }

// interface AudioElements {
//   // TODO: what is "peer" - socket id? steam id?
//   [peer: string]: AudioNodes; // TODO: replace AudioNodes with THREEjs alternative?
// }
