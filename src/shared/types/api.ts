import Peer from 'simple-peer';

export interface Client {
  steamId: string;
  clientId: string;
  isMuted: boolean;
}

export interface ServerToClientEvents {
  'current-map': (mapName: string) => void;
  'server-config': (data: Buffer<ArrayBufferLike>) => void;
  'player-positions': (data: Buffer<ArrayBufferLike>) => void;
  exception: (string: SocketApiError) => void;
  'player-on-server': (data: { roomCode: string }) => void;
  'user-left': (socketId: string, client: Client) => void;
  'user-joined': (socketId: string, client: Client) => void;
  signal: (data: { from: string; data: Peer.SignalData; client: Client }) => void;
  'microphone-state': (socketId: string, isMuted: boolean) => void;
}

export interface ClientToServerEvents {
  'server-config': (from: string, data: Buffer<ArrayBufferLike>) => void;
  exception: SocketApiError;
  'current-map': (from: string, mapName: string) => void;
  'player-positions': (from: string, data: Buffer<ArrayBufferLike>) => void;
  'join-room': (data: JoinRoomData, callback: JoinRoomCallback) => void;
  signal: (signal: Signal) => void;
  'microphone-state': (state: { isMuted: boolean }) => void;
}

export type JoinRoomCallback = (response: JoinRoomResponse) => void;

export interface Signal {
  data: Peer.SignalData;
  to: string;
}

export interface JoinRoomData {
  token: string;
  roomCode: string;
  steamId: string;
  clientId: string;
  isHost: boolean;
  isMuted: boolean;
}

export enum SocketApiErrorType {
  AuthExpired,
  InvalidApiKey,
  RoomShutdown,
  PlayerDisconnected,
  PluginOutdated,
  InvalidServerIp,
}

export interface SocketApiError {
  code: SocketApiErrorType;
  message: string;
}

export interface JoinRoomResponse {
  success: boolean;
  message: string;
  mapName?: string;
  joinedClients?: { [key: string]: Client };
  serverConfig?: ServerConfigData;
}

export interface ServerConfigData {
  deadPlayerMuteDelay: number; // seconds before players are muted after dying
  allowDeadTeamVoice: boolean; // can dead teammates communicate to each other
  allowSpectatorC4Voice: boolean; // can dead players speak when spectating C4
  volumeFalloffFactor: number; // How quickly player voice volumes are reduced as you move away from them
  volumeMaxDistance: number; // The distance at which the volume reduction starts taking effect
  occlusionNear: number; // The maximum occlusion level for players fully behind a wall at the closest distance (0 is fully occluded)
  occlusionFar: number; // The maximum occlusion when player's distance reaches OcclusionEnd
  occlusionEndDist: number; // Distance from player where it fully reaches OcclusionFar
  occlusionFalloffExponent: number; // Controls how quickly occlusion drops off with distance (higher = steeper drop near end, lower = more gradual fade)
}
