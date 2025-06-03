import Peer from 'simple-peer';
import { ServerConfigData } from './store/server-config';

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
  'muted-by-server-admin': () => void;
  'server-restart-warning': (data: { minutes: number }) => void;
  'door-rotation': (data: {
    absorigin: { x: number; y: number; z: number };
    rotation: number;
  }) => void;
}

export interface ClientToServerEvents {
  'server-config': (from: string, data: Buffer<ArrayBufferLike>) => void;
  exception: SocketApiError;
  'current-map': (from: string, mapName: string) => void;
  'player-positions': (from: string, data: Buffer<ArrayBufferLike>) => void;
  'join-room': (data: JoinRoomData, callback: JoinRoomCallback) => void;
  signal: (signal: Signal) => void;
  'microphone-state': (state: { isMuted: boolean }) => void;
  'update-config': (data: { config: ServerConfigData; clientToken: string }) => void;
  'mute-player': (data: { targetSteamId: string; clientToken: string }) => void;
  'door-rotation': (from: string, origin: string, rotation: number) => void;
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
  ReusedApiKey,
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
