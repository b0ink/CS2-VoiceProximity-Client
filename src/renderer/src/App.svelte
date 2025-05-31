<script lang="ts">
  // import TWEEN from '@tweenjs/tween.js';
  import { Alert, Button, ButtonGroup, Heading, Input, Label } from 'flowbite-svelte';
  import {
    CogSolid,
    MicrophoneSlashSolid,
    MicrophoneSolid,
    PhoneHangupSolid,
  } from 'flowbite-svelte-icons';
  import 'hacktimer';
  import Peer from 'simple-peer';
  import { Socket, io } from 'socket.io-client';
  import { onDestroy, onMount } from 'svelte';
  import { type DefaultNotificationOptions, getNotificationsContext } from 'svelte-notifications';
  import * as THREE from 'three';
  import {
    type Client,
    type ClientToServerEvents,
    type JoinRoomData,
    type JoinRoomResponse,
    type ServerConfigData,
    type ServerToClientEvents,
    type SocketApiError,
    SocketApiErrorType,
  } from '@shared/types/api';
  import { DEFAULT_PLAYER_VOLUME, OcclusionQuality } from '@shared/types/store/settings';
  import store from '@store/client';
  import serverConfigStore from '@store/server-config';
  import settings from '@store/settings';
  import { RemotePlayer } from './RemotePlayer';
  import ChangeSocketServer from './Settings/ChangeSocketServer.svelte';
  import ServerConfig from './Settings/ServerConfig.svelte';
  import SettingsOverlay from './Settings/SettingsOverlay.svelte';
  import PlayerList from './components/PlayerList.svelte';
  import SteamLoginButton from './components/SteamLoginButton.svelte';
  import { cn } from './lib/tailwind';
  import { transformVector } from './lib/vector';
  import { getMap, initializeMap } from './render/maps';
  import { renderFrame } from './render/renderFrame';
  import {
    type AudioConnectionStuff,
    type PeerConnectionBandwidth,
    type PeerConnections,
    type PlayerPositionApiData,
    type SocketClientMap,
    type SteamIdSocketMap,
  } from './type';
  import { decodePlayerData, decodeServerConfig } from './utils/decode';
  import { getUserAudio } from './utils/getUserAudio';

  const { addNotification, removeNotification } = getNotificationsContext();

  const queueNotification = (options: DefaultNotificationOptions): void => {
    window.api.setStoreValue('notification', options);
  };

  let settingsOpen: boolean;

  let serverConfigOverlayOpen: boolean = false;
  let clientIsAdmin: boolean = false;

  // Settings Store
  $: socketUrl = $settings.socketServer;

  $: if (socketUrl) {
    console.log(`SOCKET URL IS ${socketUrl}`);
  }
  $: useTurnConfig = $settings.natFixEnabled;
  $: microphoneMuted = $settings.micMuted;
  $: occlusionQuality = $settings.occlusionQuality;
  $: noiseSuppression = $settings.noiseSuppression;
  $: playerVolumes = $settings.playerVolumes;
  $: if (playerVolumes) {
    updateGainFilters();
  }
  // ClientStore
  $: clientSteamId = $store.steamId;
  $: clientToken = $store.token;
  $: turnUsername = $store.turnUsername;
  $: turnPassword = $store.turnPassword;
  $: savedRoomCode = $store.savedRoomCode;
  $: regions = $store.regions;
  $: tryReconnectRoom = $store.tryReconnectRoom;

  $: socketServerLabel = regions.find((r) => r.url === socketUrl)?.name || socketUrl;
  $: selectedRegion = regions.find((r) => r.url === socketUrl);

  // ServerConfig Store
  $: deadPlayerMuteDelay = $serverConfigStore.deadPlayerMuteDelay;
  $: allowDeadTeamVoice = $serverConfigStore.allowDeadTeamVoice;
  $: allowSpectatorC4Voice = $serverConfigStore.allowSpectatorC4Voice;
  $: deadVoiceFilterFrequency = $serverConfigStore.deadVoiceFilterFrequency;
  // $: volumeDropoffFactor = $serverConfigStore.volumeDropoffFactor;
  // $: volumeMaxDistance = $serverConfigStore.volumeMaxDistance;

  // The API will notify the client if they have joined a CS2 server but have not joined the room yet
  let playerServerRoomCode: string | undefined;

  // THREE
  let clientCamera: THREE.PerspectiveCamera | undefined;
  let scene: THREE.Scene;
  let threejs: THREE.WebGLRenderer;
  let clientListener: THREE.AudioListener;
  let remotePlayers: Map<string, RemotePlayer | undefined> = new Map<string, RemotePlayer>();

  let lastSocketException: number = 0;

  let playerPositions: PlayerPositionApiData[] = [];

  let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;
  let socketConnected = false;
  let socketClientMap: SocketClientMap = {};
  let steamIdSocketMap: SteamIdSocketMap = {};
  let peerConnections: PeerConnections = {};
  let peerConnectingBandwidth: PeerConnectionBandwidth = {};

  let roomCodeInput: string = '';
  let roomCode: string | undefined;
  let joinedRoom: boolean = false;
  let currentLobby: string | undefined = '';

  let audioConnectionStuff: AudioConnectionStuff = {
    deafened: false,
    muted: false,
    toggleMute: () => {
      /*empty*/
    },
    toggleDeafen: () => {
      /*empty*/
    },
  };

  const userJoinSound = new Audio('sound/user-joined.mp3');
  const userLeftSound = new Audio('sound/user-left.mp3');
  const micMuteSound = new Audio('sound/mic-mute.mp3');
  const micUnmuteSound = new Audio('sound/mic-unmute.mp3');

  userJoinSound.load();
  userLeftSound.load();
  micMuteSound.load();
  micUnmuteSound.load();

  const playSound = (sound: HTMLAudioElement): void => {
    const audio = sound.cloneNode() as HTMLAudioElement;
    audio.volume = 1;
    audio.play();
  };

  const unmuteMicrophone = (): void => {
    audioConnectionStuff.toggleMute(false);
    window.api.setSettingsValue('micMuted', false);
    playSound(micUnmuteSound);
    socket?.emit('microphone-state', { isMuted: false });
  };

  const muteMicrophone = (): void => {
    audioConnectionStuff.toggleMute(true);
    if (!audioConnectionStuff.stream?.getAudioTracks()[0].enabled) {
      window.api.setSettingsValue('micMuted', true);
      playSound(micMuteSound);
      socket?.emit('microphone-state', { isMuted: true });
    }
  };

  async function intialise(): Promise<void> {
    if (clientSteamId && socketUrl && !scene && clientToken) {
      const threeJsDom = document.querySelector('#threejs');
      // Ensure dom is available
      if (!threeJsDom) {
        return;
      }

      threejs = new THREE.WebGLRenderer({
        antialias: false,
      });
      scene = new THREE.Scene();
      clientListener = new THREE.AudioListener();

      const fov = 60;
      const aspect = 1920 / 1080;
      const near = 1.0;
      const far = 650.0;
      clientCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      clientCamera.position.set(-30, 2, 0);

      clientCamera.add(clientListener);

      initializeRenderer();

      await window.api.retrieveTurnCredentials();
      console.log(`initialise: Received turn credentials: ${turnUsername}, ${turnPassword}`);

      socket = io(socketUrl, {
        auth: {
          token: clientToken,
        },
      });

      socket!.on('exception', (error: SocketApiError) => {
        lastSocketException = Date.now() / 1000;

        queueNotification({
          text: error.message || 'An error occurred.',
          position: 'top-center',
          removeAfter: 5000,
          type: 'error',
        });

        if (error.code === SocketApiErrorType.AuthExpired) {
          window.api.setStoreValue('steamId', null);
          window.api.setStoreValue('token', null);
          window.api.reloadApp();
        }
      });

      socket.on('connect', () => {
        socketConnected = true;
        console.log(`socket.on('connect'): my socket id is ${socket?.id}`);
        if (tryReconnectRoom && savedRoomCode && roomCodeInput === savedRoomCode) {
          setTimeout(() => {
            // We just hope that the plugin on the CS2 server has connected before we do to ensure the room is active
            joinRoom();
            removeNotification('lost-connection');
          }, 1000);
        }
        window.api.setStoreValue('tryReconnectRoom', false);
      });

      socket.on('disconnect', async () => {
        console.log(`socket.on('disconnect') Lost connection to the socket server`);

        const timeSinceLastSocketException: number = Date.now() / 1000 - lastSocketException;

        const notification = (await window.api.getStore()).notification;
        if (!notification || timeSinceLastSocketException > 5) {
          queueNotification({
            id: 'lost-connection',
            text: 'Lost connection to the socket server. Application restarted.',
            position: 'top-center',
            removeAfter: 2500,
            type: 'warning',
          });
        }

        // attempt to reconnect to the room if we havent had any other exceptions from the socket
        if (timeSinceLastSocketException > 5 && joinedRoom && socketConnected) {
          window.api.setStoreValue('tryReconnectRoom', true);
        }

        socketConnected = false;

        window.api.reloadApp();
      });

      // eslint-disable-next-line no-undef
      let clearPlayerServerRoomCode: NodeJS.Timeout;

      socket.on('player-on-server', (data: { roomCode: string }) => {
        console.log(`socket.on('player-on-server', ${JSON.stringify(data)})`);
        playerServerRoomCode = data.roomCode;
        clearTimeout(clearPlayerServerRoomCode);

        // The server will notify the user every 5 seconds, we clear the room code if no subsequent updates after 6 seconds
        clearPlayerServerRoomCode = setTimeout(() => {
          playerServerRoomCode = undefined;
          clearTimeout(clearPlayerServerRoomCode);
        }, 6000);
      });

      // uiCamera_ = new THREE.OrthographicCamera(-1, 1, 1 * aspect, -1 * aspect, 1, 1000);
      // uiScene_ = new THREE.Scene();

      // const axesHelper = new THREE.AxesHelper(50);
      // scene.add(axesHelper);

      // TODO: one time notification when logging in for the first time
      // addNotification({
      //   text: 'Successfully authenticated',
      //   position: 'top-center',
      //   removeAfter: 2500,
      //   type: 'success',
      // });

      // Log if we're receiving packets from remote stream
      setInterval(() => {
        Object.entries(peerConnections).forEach(([id, pc]) => {
          const rtcPeer = (pc as any)._pc;
          if (!rtcPeer) return;

          rtcPeer.getStats().then((stats) => {
            stats.forEach((report) => {
              if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                // console.log(
                //   `Peer ${id} - packetsReceived: ${report.packetsReceived}, bytesReceived: ${report.bytesReceived}, jitter: ${report.jitter}`,
                // );
                if (!peerConnectingBandwidth[id]) {
                  peerConnectingBandwidth[id] = 0;
                }
                peerConnectingBandwidth[id] = report.bytesReceived;
              }
            });
          });
        });
        peerConnectingBandwidth = { ...peerConnectingBandwidth };
      }, 1000);

      socket?.on('server-restart-warning', (data) => {
        const minutesRemaining = data.minutes;
        console.log(
          `socket.on('server-restart-warning'): Server will restart in ${minutesRemaining * 60} seconds`,
        );
        // TODO: alert server restart warning
      });

      socket?.on('muted-by-server-admin', () => {
        console.log(`socket.on('muted-by-server-admin'):`);
        muteMicrophone();
      });

      socket?.on('current-map', async (mapName) => {
        console.log(`socket.on('current-map'): ${mapName}`);
        await initializeMap({
          scene: scene,
          mapName,
        });
      });

      socket?.on('server-config', async (data: Buffer) => {
        console.log(`socket.on('server-config'): ${data}`);
        const serverConfig = decodeServerConfig(data);
        console.log(`socket.on('server-config'):`, serverConfig);
        if (JSON.stringify(serverConfig) !== JSON.stringify($serverConfigStore)) {
          addNotification({
            text: `Proximity config updated`,
            position: 'top-center',
            removeAfter: 1500,
            type: 'success',
          });
        }
        serverConfigStore.set({
          deadPlayerMuteDelay: serverConfig.deadPlayerMuteDelay,
          allowDeadTeamVoice: serverConfig.allowDeadTeamVoice,
          allowSpectatorC4Voice: serverConfig.allowSpectatorC4Voice,
          volumeFalloffFactor: serverConfig.volumeFalloffFactor,
          volumeMaxDistance: serverConfig.volumeMaxDistance,
          occlusionNear: serverConfig.occlusionNear,
          occlusionFar: serverConfig.occlusionFar,
          occlusionEndDist: serverConfig.occlusionEndDist,
          occlusionFalloffExponent: serverConfig.occlusionFalloffExponent,
          alwaysHearVisiblePlayers: serverConfig.alwaysHearVisiblePlayers,
          deadVoiceFilterFrequency: serverConfig.deadVoiceFilterFrequency,
        });
      });

      socket?.on('microphone-state', (socketId: string, isMuted: boolean) => {
        console.log(`socket.on(microphone-state): ${socketId}  isMuted: ${isMuted}`);
        const client = socketClientMap[socketId];
        if (client) {
          client.isMuted = isMuted;
        } else {
          console.error(
            `socket.on(microphone-state): Tried to update microphone-state for an unknown socket ${socketId}`,
          );
        }
      });

      // socket?.on('player-positions', (players: PlayerPositionApiData[]) => {
      socket?.on('player-positions', (data) => {
        if (!joinedRoom) {
          return;
        }

        const mySocketId = socket?.id;
        if (!mySocketId) {
          return;
        }

        playerPositions = decodePlayerData(data);
        // console.log(playerPositions);

        const me = playerPositions.find((player) => player.steamId === getSteamId());

        let spectatedPlayerPosition: THREE.Vector3 | null;
        let hasSpectatedPosition = false;

        // Get the position of the player being spectated
        if (me) {
          for (const player of playerPositions) {
            if (player.steamId === getSteamId()) {
              clientIsAdmin = player.isAdmin ?? false;
              if (!me.isAlive) {
                const playerOrigin = new THREE.Vector3(
                  player.originX,
                  player.originY,
                  player.originZ,
                );
                spectatedPlayerPosition = playerOrigin;
                hasSpectatedPosition = true;
                break;
              }
            }
          }
        }

        for (const player of playerPositions) {
          const steamId = player.steamId;
          if (!steamId) {
            continue;
          }
          const playerOrigin = new THREE.Vector3(player.originX, player.originY, player.originZ);
          const playerLookAt = new THREE.Vector3(player.lookAtX, player.lookAtY, player.lookAtZ);

          const transformedOrigin = transformVector(playerOrigin);
          const transformedLookAt = transformVector(playerLookAt);

          // TODO: will tweening the camera to the next position smooth out the audio glitches?
          // new TWEEN.Tween(camera_.position)
          //   .to(position, 1)
          //   .easing(TWEEN.Easing.Cubic)
          //   .start();

          if (steamId === getSteamId()) {
            clientCamera?.position.set(
              transformedOrigin.x,
              transformedOrigin.y,
              transformedOrigin.z,
            );
            clientCamera?.lookAt(transformedLookAt);
          } else {
            const positionalSound = remotePlayers.get(steamId);

            if (!positionalSound) {
              continue;
            }

            if (
              me &&
              !player.isAlive && // player is dead
              (me.isAlive || // mute if im alive (don't want to hear any dead players)
                player.team !== me.team || // or if the player is an enemy
                allowDeadTeamVoice) && // or if config disallows dead teammates hearing eachother
              (!player.spectatingC4 || !allowSpectatorC4Voice) // and if they're not spectating the c4, and spectators are allowed to communicate from c4
            ) {
              // convert seconds to ms
              positionalSound.Mute(deadPlayerMuteDelay * 1000);
            } else {
              positionalSound.Unmute(); // unmute if player is alive, or we're both dead and on the same team
            }

            const sameTeamAndDead = !player.isAlive && player.team === me?.team;

            const playerIsBeingSpectated =
              hasSpectatedPosition && playerOrigin.distanceTo(spectatedPlayerPosition!) <= 10;

            if (me && !me.isAlive && (playerIsBeingSpectated || sameTeamAndDead)) {
              positionalSound.SwitchToMono(player.isAlive ?? false);
              positionalSound.setMonoHighPassFilterFrequency(
                player.isAlive ? 100 : deadVoiceFilterFrequency,
              );
            } else {
              positionalSound.SwitchToStereo();
            }

            if (positionalSound.playerObject) {
              positionalSound.playerObject?.position.set(
                transformedOrigin.x,
                transformedOrigin.y,
                transformedOrigin.z,
              );
              positionalSound.playerObject?.lookAt(transformedLookAt);
            } else {
              console.warn(`No soundObjSource for steam ${steamId}`);
            }
            // break;
          }
        }

        renderFrame(threejs, scene, clientCamera, settingsOpen, updateSoundFilters);
      });
    }
  }

  const getSteamId = (): string | null => {
    return clientSteamId;
  };

  const initUserMedia = async (): Promise<void> => {
    const userAudio = await getUserAudio();
    if (!userAudio) {
      return;
    }
    const { stream, noiseSupressionEnabled } = userAudio;

    if (noiseSuppression && !noiseSupressionEnabled) {
      addNotification({
        text: `Failed to enable noise suppression.`,
        position: 'top-center',
        removeAfter: 5000,
        type: 'warning',
      });
    }

    const inStream = stream;

    // TODO: what WILL be the difference between stream & inStream
    audioConnectionStuff.stream = stream;
    audioConnectionStuff.instream = inStream;

    audioConnectionStuff.toggleMute = (muted: boolean) => {
      audioConnectionStuff.muted = muted;
      // TODO: implement deafen
      // if (audioConnectionStuff.deafened) {
      //   audioConnectionStuff.deafened = false;
      //   audioConnectionStuff.muted = false;
      // }
      inStream.getAudioTracks()[0].enabled =
        !audioConnectionStuff.muted && !audioConnectionStuff.deafened;
      // setMuted(audioConnectionStuff.current.muted);
      // setDeafened(audioConnectionStuff.current.deafened);
    };

    if (microphoneMuted) {
      console.log('Joining the room muted');
      inStream.getAudioTracks()[0].enabled = false;
    }

    // audioElements = {};
    // TODO: call connect() when our lobby room code has been provided
    // connect(currentLobby, )
    connect(roomCode!, getSteamId()!, getSteamId()!, false);

    // useTurnConfig = await window.api.getSettingsValue('natFixEnabled', true);

    const createPeerConnection = (
      peer: string,
      initiator: boolean,
      client: Client,
    ): Peer.Instance => {
      console.log('CreatePeerConnection: ', peer, initiator, stream);
      // console.log(`Using turn config?:`, useTurnConfig);
      if (!useTurnConfig) {
        console.warn(
          'NAT fix is disabled — your IP address may be visible to other users with direct connection enabled.',
        );
      }

      if (!turnUsername || !turnPassword) {
        window.api.reloadApp();
      }

      // Cleanup any leftover data from this steamid first before initialising it again
      const incomingClient = client;
      if (incomingClient.steamId && steamIdSocketMap[incomingClient.steamId]) {
        const oldSocketId = steamIdSocketMap[incomingClient.steamId];
        cleanupUser(oldSocketId, incomingClient);
      }
      // disconnectClient(client); // TODO:

      // eslint-disable-next-line no-undef
      const DEFAULT_ICE_CONFIG: RTCConfiguration = {
        iceTransportPolicy: 'all',
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: selectedRegion ? selectedRegion.stun : 'stun:turn.cs2voiceproximity.chat',
          },
          {
            urls: selectedRegion ? selectedRegion.turn : 'turn:turn.cs2voiceproximity.chat',
            username: turnUsername!,
            credential: turnPassword!,
          },
        ],
      };

      // eslint-disable-next-line no-undef
      const ICE_CONFIG_TURN: RTCConfiguration = {
        iceTransportPolicy: 'relay', // protect IPs
        iceServers: [
          {
            urls: selectedRegion ? selectedRegion.turn : 'turn:turn.cs2voiceproximity.chat',
            username: turnUsername!,
            credential: turnPassword!,
          },
        ],
      };

      console.log(ICE_CONFIG_TURN);

      const connection = new Peer({
        stream,
        initiator,
        // @ts-ignore line
        iceRestartEnabled: true,
        config: useTurnConfig ? ICE_CONFIG_TURN : DEFAULT_ICE_CONFIG,
        // config: DEFAULT_ICE_CONFIG,
        trickle: true,
      });

      // setPeerConnections((connections) => {
      //   connections[peer] = connection;
      //   return connections;
      // });

      socketClientMap[peer] = client;
      peerConnections[peer] = connection;
      steamIdSocketMap[client.steamId] = peer;

      // Trigger reactive state
      peerConnections = { ...peerConnections };
      socketClientMap = { ...socketClientMap };
      steamIdSocketMap = { ...steamIdSocketMap };

      console.log(`Assigning ${peer} to ${client.steamId}`);

      connection.on('connect', () => {
        // setTimeout(() => {
        //   if (hostRef.current.isHost && connection.writable) {
        //     try {
        //       console.log('sending settings..');
        //       connection.send(JSON.stringify(lobbySettingsRef.current));
        //     } catch (e) {
        //       console.warn('failed to update lobby settings: ', e);
        //     }
        //   }
        // }, 1000);
      });

      connection.on('iceCandidate', (candidate) => {
        console.log('Candidate:', candidate);
      });

      connection.on('signal', (data) => {
        console.log(`connection.on('signal'): ${JSON.stringify(data)}`);
        socket?.emit('signal', {
          data,
          to: peer,
        });
      });

      connection.on('stream', async (stream: MediaStream) => {
        console.log(
          `connection.on('stream'): stream from steamId:${client.steamId}; peer: ${peer}`,
        );
        initialiseRemotePlayer(stream, client);
      });

      connection.on('error', (error: Error) => {
        console.log(`connection.on('error'): ${JSON.stringify(error)}`);
        peerConnectingBandwidth[peer] = 0;
        // cleanupUser(peer, socketClientMap[peer]);

        if ('code' in error && error.code !== 'ERR_DATA_CHANNEL') {
          // TODO: play a disconnect sound effect so that user is aware mid game
          queueNotification({
            text: `Something weird happened. Please rejoin the room. ${error}`,
            position: 'top-center',
            removeAfter: 10000,
            type: 'error',
          });
        }

        // window.api.reloadApp();
      });
      return connection;
    };

    socket?.on('user-joined', async (peer: string, client: Client) => {
      console.log(`socket.on('user-joined') ${peer} ${JSON.stringify(client)}`);

      // TODO: validate turn credentials on the front end to make sure they're not expired, only fetch from main process when necessary
      // await window.api.retrieveTurnCredentials();
      playSound(userJoinSound);

      socketClientMap[peer] = client;
      socketClientMap = { ...socketClientMap };

      createPeerConnection(peer, true, client);
    });

    socket?.on('user-left', async (peer: string, client: Client) => {
      playSound(userLeftSound);

      console.log(`socket.on('user-left') ${peer} ${client.steamId}`);
      cleanupUser(peer, client);
    });

    socket?.on(
      'signal',
      ({ data, from, client }: { data: Peer.SignalData; from: string; client: Client }) => {
        console.log(`1. socket.on('signal') ${client.steamId} ${from} ${JSON.stringify(data)}`);
        console.log(`2. socket.on('signal') ${JSON.stringify(data)}`);
        let connection: Peer.Instance;
        if (!socketClientMap[from]) {
          console.error(
            `socket.on('signal'): (unknown socket) peer: ${from} - ${socketClientMap[from]}`,
          );
          return;
        }
        if (Object.prototype.hasOwnProperty.call(data, 'type')) {
          if (peerConnections[from] && data.type !== 'offer') {
            connection = peerConnections[from];
          } else {
            connection = createPeerConnection(from, false, client);
          }
          if (connection && !connection.destroyed) {
            connection.signal(data);
          } else {
            addNotification({
              text: `Failed to crete peer connection with ${client.steamId}`,
              position: 'top-center',
              removeAfter: 5000,
              type: 'warning',
            });
            console.error(
              `socket.on('signal') Failed to initiate peer conencton with ${client.steamId}. ${turnUsername} - ${turnPassword}`,
            );
          }
        }
      },
    );
  };

  const cleanupUser = (peer: string, client: Client): void => {
    console.log(`Cleaning up user data for ${client.steamId}`);
    const positionalSound = remotePlayers.get(client.steamId);
    if (positionalSound) {
      positionalSound.playerVoice3D?.disconnect();
      positionalSound.playerVoice2D?.disconnect();
      positionalSound.playerObject?.parent?.remove(positionalSound.playerObject);
      console.log('found sound source removing from scene');
      remotePlayers.delete(client.steamId);
    }

    peerConnections[peer]?.destroy();
    delete peerConnections[peer];
    delete socketClientMap[peer];
    peerConnections = { ...peerConnections };
    socketClientMap = { ...socketClientMap };
  };

  const connect = (
    lobbyCode: string,
    playerId: string,
    clientId: string,
    isHost: boolean,
  ): void => {
    if (!clientToken) {
      window.api.reloadApp();
      return;
    }

    // setOtherVAD({});
    // setOtherTalking({}); // probably used for talking indicators?
    if (lobbyCode === 'MENU') {
      console.log('lobby code is menu?');
      // Object.keys(peerConnections).forEach((k) => {
      //   disconnectPeer(k);
      // });
      // setSocketClients({});
      socketClientMap = {};
      currentLobby = lobbyCode;
    } else if (currentLobby !== lobbyCode) {
      console.log(`Connecting to ${lobbyCode} as ${clientId}`);

      // socket?.emit('leave');
      // socket?.emit('id', playerId, clientId);

      const joinRoomPayload: JoinRoomData = {
        token: clientToken,
        roomCode: lobbyCode,
        // TODO: combine steamid, clientid, ismuted with the Client object
        steamId: playerId,
        clientId: clientId, // TODO: deprecate clientId (only use steamId)
        isMuted: microphoneMuted,

        isHost: isHost, // TODO: remove this
      };

      socket?.emit('join-room', joinRoomPayload, async (response: JoinRoomResponse) => {
        // TODO: we should validate there are no duplicate steamIds trying to join
        console.log(`socket.emit('join-room'): ${JSON.stringify(joinRoomPayload)}`);
        console.log(JSON.stringify(response));
        if (response.success) {
          socketClientMap = {
            ...socketClientMap,
            ...response.joinedClients,
          };
          currentLobby = lobbyCode;
          document.querySelector('#threejs')!.innerHTML = '';
          initializeRenderer();
          await initializeMap({
            scene: scene,
            mapName: response.mapName ?? 'de_dust2',
          });
          if (response.serverConfig) {
            serverConfigStore.set({
              ...response.serverConfig,
            });
          }
          playSound(userJoinSound);
          joinedRoom = true;
        } else {
          roomCode = undefined;
          currentLobby = undefined;
          // TODO: check for error codes, reload the app if not authenticated, only give error if room doesn't exist etc

          if (
            response.message.indexOf('Token has expired') !== -1 ||
            response.message.indexOf('Invalid steamId') !== -1 ||
            response.message.indexOf('Invalid token') !== -1
          ) {
            window.api.setStoreValue('steamId', null);
            window.api.setStoreValue('token', null);
            queueNotification({
              text: 'Authentication expired',
              position: 'top-center',
              removeAfter: 5000,
              type: 'error',
            });
          } else {
            queueNotification({
              text: response.message,
              position: 'top-center',
              removeAfter: 2500,
              type: 'error',
            });
          }
          // TODO: so if you try joining a room that doesnt exist, and then join a room that does exist, the receiving peers will receive an error saying that our peer is already destroyed
          // TODO: reloading the app is a hotfix, but will need to be addressed once we refactor how and when we call getUserMedia
          window.api.reloadApp();
        }
      });
    }
  };

  const updateSoundFilters = (): void => {
    const map = getMap();
    if (map) {
      for (const soundData of remotePlayers.values()) {
        soundData?.updateFilters(map, occlusionQuality, $serverConfigStore);
      }
    }
  };

  const updateGainFilters = (): void => {
    for (const soundData of remotePlayers.values()) {
      if (soundData?.steamId !== undefined) {
        const gainAmount = playerVolumes[soundData?.steamId] ?? DEFAULT_PLAYER_VOLUME;
        // console.log(gainAmount);
        soundData?.SetGain(gainAmount / 100);
      }
    }
  };

  const initialiseRemotePlayer = (remoteStream: MediaStream, client: Client): void => {
    const remotePlayer = new RemotePlayer(
      remoteStream,
      client,
      clientCamera!,
      scene,
      clientListener,
    );
    remotePlayers.set(client.steamId, remotePlayer);
    updateGainFilters();
    console.log(`Creating remote player: ${client.steamId}`);
  };

  const initializeRenderer = (): void => {
    if (!threejs) {
      console.error(`threeJs is not available yet.`);
      return;
    }
    threejs.autoClear = true;

    const threeJsDom = document.querySelector('#threejs');
    if (!threeJsDom) {
      console.error(`initializeRenderer(): threeJsDom is null`);
      return;
    }

    threeJsDom.appendChild(threejs.domElement);
  };

  const joinRoom = (): void => {
    if (roomCode && socketUrl && clientSteamId && clientToken) {
      return;
    }
    playerServerRoomCode = undefined;

    // const roomCode = (document.getElementById('room-code') as HTMLInputElement).value;
    const code = roomCodeInput;
    console.log(`Attempting to join room code ${code}`);

    if (code) {
      roomCode = code;
      initUserMedia();
      window.api.setStoreValue('savedRoomCode', roomCode);
    } else {
      roomCode = undefined;
      console.log('invalid room code');
      addNotification({
        text: 'Invalid room code',
        position: 'top-center',
        removeAfter: 2500,
        type: 'error',
      });
    }
  };

  // let mapName: string = 'de_dust2';
  // const onMapChange = async (): Promise<void> => {
  //   console.log(mapName);
  //   if (!isConnected) {
  //     console.log('Waiting for room connection before loading map.');
  //     return;
  //   }
  //   map = await initializeMap({
  //     map: map,
  //     scene: scene,
  //     mapName,
  //   });
  // };

  let isConnected = false;

  const checkConnection = (): void => {
    isConnected = joinedRoom;
  };

  setInterval(checkConnection, 500);

  onMount(() => {
    // intialise();
    //TODO: can fire an event from main -> renderer? instead of checking every few seconds
    const interval = setInterval(intialise, 10);

    // Cleanup the interval when the component is destroyed
    onDestroy(() => {
      clearInterval(interval);
    });

    checkNotifications();

    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);

    window.api.onToggleMuteMicrophone(() => {
      console.log('Toggling mute via keybind');
      if (microphoneMuted) {
        unmuteMicrophone();
      } else {
        muteMicrophone();
      }
    });
  });

  $: if (savedRoomCode) {
    roomCodeInput = savedRoomCode;
  }

  async function checkNotifications(): Promise<void> {
    const notification = (await window.api.getStore()).notification;

    if (notification) {
      addNotification(notification);
      await window.api.setStoreValue('notification', null); // clear after showing
    }
  }

  // Allows debugging of steam auth, still requires a valid jwt
  (window as any).saveAuth = function (steamId: string, jwt: string) {
    window.api.setStoreValue('steamId', steamId);
    window.api.setStoreValue('token', jwt);
  };

  (window as any).debugRenderer = function () {
    console.log(threejs.info);
  };

  // (window as any).debugSocket = function () {
  //   console.log(socket);
  // };

  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping');

  function handleKeydown(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      settingsOpen = false;
      serverConfigOverlayOpen = false;
    }
  }

  function saveConfig(cfg: ServerConfigData): void {
    if (!clientToken) {
      return;
    }
    console.log(`Updating config with: ${JSON.stringify(cfg)}`);
    socket?.emit('update-config', {
      config: cfg,
      clientToken,
    });
    serverConfigOverlayOpen = false;
  }

  window.addEventListener('keydown', handleKeydown);
</script>

<!-- <a target="_blank" rel="noreferrer" on:click={ipcHandle}>Send IPC</a> -->
<SettingsOverlay
  bind:open={settingsOpen}
  bind:serverConfigOpen={serverConfigOverlayOpen}
  serverConfigEnabled={isConnected}
/>

{#if serverConfigOverlayOpen}
  <div
    class="w-full h-lvh absolute dark:bg-gray-900/90 backdrop-blur-xl z-10 p-5 p2-2 overflow-y-scroll scrollbar"
  >
    <div class="text-center">
      <Heading tag="h1" class="mb-4 text-xl font-extrabold">Server Config</Heading>
    </div>
    <ServerConfig isDisabled={!clientIsAdmin} {saveConfig} />
  </div>
{/if}

<div
  class={cn(
    'p-5',
    (!clientSteamId || !socketUrl) && 'flex flex-col items-center justify-center w-full h-dvh',
  )}
>
  <div class={cn('flex w-full items-center', isConnected ? 'justify-center' : 'justify-between')}>
    <!-- <Label for="room-code" class="mb-2">Room Code:</Label> -->
    {#if clientSteamId && socketUrl}
      <svelte:component
        this={microphoneMuted ? MicrophoneSlashSolid : MicrophoneSolid}
        onclick={() => (microphoneMuted ? unmuteMicrophone() : muteMicrophone())}
        color={microphoneMuted ? 'red' : 'grey'}
        class={cn(
          'cursor-pointer z-20 select-none transition-all duration-300',
          // 'absolute top-5.5 left-4',
        )}
        size="lg"
      />
      <div
        class={cn(
          'w-full',
          !isConnected && 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-64',
        )}
      >
        {#if !isConnected && socketUrl}
          <Label class="mb-2">Server IP:</Label>
        {/if}

        {#if socketUrl}
          <ButtonGroup
            class={cn('w-full ', isConnected && 'max-w-54 ml-4 mr-4')}
            size={!isConnected ? 'md' : 'sm'}
          >
            <Input
              id="room-code"
              name="room-code"
              disabled={isConnected || !socketConnected}
              bind:value={roomCodeInput}
              placeholder="Room code"
            />
            {#if isConnected && socketConnected}
              <Button
                color="red"
                class="cursor-pointer"
                type="submit"
                onclick={() => {
                  playSound(userLeftSound);
                  Object.keys(peerConnections).forEach((k) => {
                    cleanupUser(k, socketClientMap[k]);
                  });
                  isConnected = false;
                  joinedRoom = false;
                  roomCode = undefined;
                  setTimeout(() => {
                    window.api.reloadApp();
                  }, 350);
                }}
              >
                <PhoneHangupSolid
                  color="white"
                  class={cn('cursor-pointer select-none transition-all duration-300')}
                /></Button
              >
            {:else}
              <Button
                color="primary"
                class="cursor-pointer"
                type="submit"
                onclick={joinRoom}
                disabled={isConnected ||
                  !socketConnected ||
                  !turnUsername ||
                  !turnPassword ||
                  !!roomCode}
              >
                Join</Button
              >{/if}
          </ButtonGroup>
        {/if}

        {#if !isConnected && socketUrl}
          <div class={cn('w-full text-center text-gray-400 text-sm p-2')}>
            Region: <button
              class="text-gray-500 cursor-pointer hover:text-primary-600"
              onclick={() => {
                settingsOpen = true;
              }}>{socketServerLabel}</button
            >
          </div>
        {/if}
      </div>
    {/if}

    <CogSolid
      onclick={() => {
        settingsOpen = !settingsOpen;
        serverConfigOverlayOpen = false;
      }}
      color={settingsOpen ? 'var(--color-primary-600)' : 'grey'}
      class={cn(
        'cursor-pointer z-20 select-none transition-all duration-300',
        // clientSteamId || settingsOpen ? 'top-7' : 'bottom-5.5',
        !clientSteamId ? 'absolute top-7.5 right-5.5' : '',
        settingsOpen ? 'rotate-90' : 'rotate-0',
      )}
      size="lg"
    />
  </div>
  {#if !clientSteamId || !socketUrl}
    <Heading tag="h1" class="mb-4 text-xl font-extrabold z-5">CS2 Proximity Chat</Heading>
    {#if socketUrl && !clientSteamId}
      <SteamLoginButton />
    {:else}
      <ChangeSocketServer />
    {/if}
  {/if}

  {#if clientSteamId && socketUrl}
    {#if !socketConnected}
      <Alert color="yellow" class="text-center mb-4 mt-4">
        <span class="font-medium">Connecting to the backend service...</span>
      </Alert>
    {/if}
    {#if playerServerRoomCode && !isConnected}
      <Alert color="green" class="text-center mb-4 mt-4">
        <span class="font-medium">
          You are connected to a server<br />(Steam ID detected)<br />
          <button
            class="underline cursor-pointer hover:text-black"
            onclick={() => {
              if (playerServerRoomCode) {
                roomCodeInput = playerServerRoomCode;
                joinRoom();
              }
            }}>Connect now.</button
          >
        </span>
      </Alert>
    {/if}

    {#if !playerServerRoomCode && !isConnected && socketConnected}
      <div class="text-center text-gray-500 text-xs mt-12">
        Join the CS2 Server to auto-retrieve the room code if Proximity Chat is enabled.
      </div>
    {/if}

    {#if !turnUsername || !turnPassword}
      <Alert color="orange" class="text-center mb-4 mt-4">
        <span class="font-medium">Failed to fetch TURN credentials.</span>
        <p>Please try logging out and back in, restarting the app, or try again later.</p>
      </Alert>
    {/if}

    <div class="m-2 overflow-hidden relative">
      {#if roomCode}
        <div class="absolute left-0 top-0 bg-black text-white text-xs p-1 z-5">
          <span>Occlusion Detail:</span>
          {OcclusionQuality[occlusionQuality]}
        </div>
      {/if}
      {#if microphoneMuted}
        <div
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs p-1 z-5"
        >
          <span>You are currently muted</span>
        </div>
      {/if}
      <!-- <div class="absolute right-0 top-0 bg-black text-white text-xs p-1 z-5">
        <UserSettingsSolid
          onclick={() => {
            serverConfigOverlayOpen = !serverConfigOverlayOpen;
          }}
          color={serverConfigOverlayOpen ? 'var(--color-primary-600)' : 'grey'}
          class={cn(
            'cursor-pointer z-20 select-none transition-all duration-300',
            serverConfigOverlayOpen ? 'rotate-90' : 'rotate-0',
          )}
          size="md"
        />
      </div> -->
      <div class={cn('dark:bg-gray-900 relative', !isConnected && 'hidden')} id="threejs"></div>
    </div>

    {#if !!roomCode && isConnected}
      <PlayerList
        mySteamId={clientSteamId}
        players={playerPositions}
        joinedSocketConnections={socketClientMap}
        {peerConnectingBandwidth}
        {socket}
        {clientIsAdmin}
      ></PlayerList>
    {/if}
  {/if}
  <div
    class={cn(
      ' absolute bottom-0 text-center text-xs left-1/2  -translate-x-1/2 ',
      !isConnected ? 'mb-6.5 text-gray-400' : 'mb-1 text-gray-500',
    )}
  >
    <div>v{window.api.clientVersion()}</div>
    {#if !clientSteamId && socketUrl}
      <div>
        Region: <button
          class="text-gray-500 cursor-pointer hover:text-primary-600"
          onclick={() => {
            settingsOpen = true;
          }}>{socketServerLabel}</button
        >
      </div>
    {/if}
  </div>
</div>
