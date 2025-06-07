import { writable } from 'svelte/store';

export const clientIsAdmin = writable(false);
export const roomCode = writable('');
export const connectedToRoom = writable(false);

// The API will notify the client if they have joined a CS2 server but have not joined the room yet
export const detectedRoomCode = writable<string | undefined>(undefined);
