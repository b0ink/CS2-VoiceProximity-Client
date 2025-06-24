import Peer from 'simple-peer';
import type { Client } from '@shared/types/api';

export enum CsTeam {
  None = 0,
  Spectator = 1,
  Terrorist = 2,
  CounterTerrorist = 3,
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
  isAdmin?: boolean;
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

// export interface RTCConfigurationData {
//   bundlePolicy?: RTCBundlePolicy;
//   certificates?: RTCCertificate[];
//   iceCandidatePoolSize?: number;
//   iceServers?: RTCIceServer[];
//   iceTransportPolicy?: RTCIceTransportPolicy;
//   rtcpMuxPolicy?: RTCRtcpMuxPolicy;
// }

// export interface RTCIceServer {
//   credential?: string;
//   urls: string | string[];
//   username?: string;
// }
