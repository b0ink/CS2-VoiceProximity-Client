import Peer from 'simple-peer';
import type { ServerConfigData } from './store/server-config';

export enum CsTeam {
  None = 0,
  Spectator = 1,
  Terrorist = 2,
  CounterTerrorist = 3,
}

export interface Client {
  steamId: string;
  clientId: string; // this would have to be unique to the players PC?
  isMuted: boolean;
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

export interface PeerConnectionBandwidth {
  [peer: string]: number;
}

export interface PlayerPositionApiData {
  steamId?: string;
  name?: string;
  originX?: number;
  originY?: number;
  originZ?: number;
  lookAtX?: number;
  lookAtY?: number;
  lookAtZ?: number;
  team?: CsTeam;
  isAlive?: boolean;
  spectatingC4?: boolean;
}

export interface AudioConnectionStuff {
  // socket? typeof Socket;
  stream?: MediaStream;
  instream?: MediaStream;
  // microphoneGain?: GainNode;
  // audioListener?: VadNode;
  muted: boolean;
  deafened: boolean;
  toggleMute: (muted: boolean) => void;
  toggleDeafen: () => void;
}

export interface JoinRoomResponse {
  success: boolean;
  message: string;
  mapName?: string;
  joinedClients?: { [key: string]: Client };
  serverConfig?: ServerConfigData;
}

export interface JoinRoomData {
  token: string;
  roomCode: string;
  steamId: string;
  clientId: string;
  isHost: boolean;
  isMuted: boolean;
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
