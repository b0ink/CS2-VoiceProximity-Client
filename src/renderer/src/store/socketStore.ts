import type { Socket } from 'socket.io-client';
import { writable } from 'svelte/store';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types/api';
import type {
  PeerConnectionBandwidth,
  PeerConnections,
  SocketClientMap,
  SteamIdSocketMap,
} from '../type';

export const socket = writable<Socket<ServerToClientEvents, ClientToServerEvents> | undefined>(
  undefined,
);
export const socketConnected = writable(false);
export const socketClientMap = writable<SocketClientMap>({});
export const steamIdSocketMap = writable<SteamIdSocketMap>({});
export const peerConnections = writable<PeerConnections>({});
export const peerConnectingBandwidth = writable<PeerConnectionBandwidth>({});
export const lastSocketException = writable(0);
