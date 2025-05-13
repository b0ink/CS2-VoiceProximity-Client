<script lang="ts">
  // import TWEEN from '@tweenjs/tween.js';
  import { decode } from '@msgpack/msgpack';
  import { Alert, Button, ButtonGroup, Heading, Input, Label } from 'flowbite-svelte';
  import { CogSolid, MicrophoneSlashSolid, MicrophoneSolid } from 'flowbite-svelte-icons';
  import 'hacktimer';
  import Peer from 'simple-peer';
  import { io, Socket } from 'socket.io-client';
  import { onDestroy, onMount } from 'svelte';
  import { getNotificationsContext, type DefaultNotificationOptions } from 'svelte-notifications';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three-stdlib';
  import PlayerList from './components/PlayerList.svelte';
  import SteamLoginButton from './components/SteamLoginButton.svelte';
  import { transformVector } from './lib/vector';
  import maps from './maps';
  import { RemotePlayer } from './RemotePlayer';
  import SettingsOverlay from './Settings/SettingsOverlay.svelte';
  import { cn } from './shared/tailwind';
  import type {
    AudioConnectionStuff,
    Client,
    JoinRoomResponse,
    PeerConnections,
    PlayerPositionApiData,
    SocketClientMap,
    SteamIdSocketMap,
  } from './type';

  const { addNotification } = getNotificationsContext();

  const queueNotification = (options: DefaultNotificationOptions) => {
    window.api.setStoreValue('notification', options);
  };

  // eslint-disable-next-line no-undef
  const DEFAULT_ICE_CONFIG: RTCConfiguration = {
    iceTransportPolicy: 'all',
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
      {
        urls: 'stun:stun.relay.metered.ca:80',
      },
    ],
  };

  let clientCamera: THREE.PerspectiveCamera | undefined;

  let socket_: Socket | undefined;
  let socketConnected = false;

  let mapScale_: number;
  let map_: THREE.Group<THREE.Object3DEventMap> | undefined;
  let scene_: THREE.Scene;
  let sounds_: Map<string, RemotePlayer | undefined>;
  let threejs_: THREE.WebGLRenderer;
  let listener_: THREE.AudioListener;

  let settingsOpen: boolean;

  let playerPositions: PlayerPositionApiData[] = [];

  let clientSteamId: string | null;
  let clientToken: string | null;
  let socketUrl: string;
  let devices = [];
  let selectedDeviceId = '';

  let socketClientMap: SocketClientMap = {};
  let steamIdSocketMap: SteamIdSocketMap = {};
  let peerConnections: PeerConnections = {};
  let audioConnectionStuff: AudioConnectionStuff;

  let roomCode: string | undefined;
  let joinedRoom: boolean = false;

  let turnUsername: string | undefined;
  let turnPassword: string | undefined;

  let roomCodeInput: string = '';

  let microphoneMuted: boolean = false;

  let currentLobby = '';

  audioConnectionStuff = {
    deafened: false,
    muted: false,
    toggleMute: () => {
      /*empty*/
    },
    toggleDeafen: () => {
      /*empty*/
    },
  };

  sounds_ = new Map<string, RemotePlayer>();
  mapScale_ = 39.3701;

  const unmuteMicrophone = () => {
    microphoneMuted = false;
    audioConnectionStuff.toggleMute(microphoneMuted);
  };

  const muteMicrophone = () => {
    microphoneMuted = true;
    audioConnectionStuff.toggleMute(microphoneMuted);
  };

  async function intialise() {
    // TODO: move into its own settings store file
    clientSteamId = await window.api.getStoreValue('steamId');
    clientToken = await window.api.getStoreValue('token');
    socketUrl = await window.api.getSocketUrl();

    if (clientSteamId && socketUrl && !scene_) {
      await window.api.retrieveTurnCredentials();
      turnUsername = await window.api.getStoreValue('turnUsername');
      turnPassword = await window.api.getStoreValue('turnPassword');

      console.log(`Received turn credentials: ${turnUsername}, ${turnPassword}`);

      socket_ = io(socketUrl);

      // Trigger reactive state of socket_
      //TODO: if we were already in a room, reconnect here (attempt to survive server restarts)
      socket_.on('connect', () => {
        socketConnected = true;
      });
      socket_.on('disconnect', () => {
        socketConnected = false;
        window.api.reloadApp();
        // TODO: toast notification

        queueNotification({
          text: 'Lost connection to the socket server. Application restarted.',
          position: 'top-center',
          removeAfter: 2500,
          type: 'warning',
        });
        console.error(`Lost connection to the socket server`);
      });

      scene_ = new THREE.Scene();
      listener_ = new THREE.AudioListener();

      const fov = 60;
      const aspect = 1920 / 1080;
      const near = 1.0;
      const far = 650.0;
      clientCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      clientCamera.position.set(-30, 2, 0);

      // uiCamera_ = new THREE.OrthographicCamera(-1, 1, 1 * aspect, -1 * aspect, 1, 1000);
      // uiScene_ = new THREE.Scene();

      const axesHelper = new THREE.AxesHelper(50);
      scene_.add(axesHelper);
      clientCamera.add(listener_);

      initializeRenderer_();

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
                console.log(
                  `Peer ${id} - packetsReceived: ${report.packetsReceived}, bytesReceived: ${report.bytesReceived}, jitter: ${report.jitter}`,
                );
              }
            });
          });
        });
      }, 1000);

      // initializeScene_();

      // initializePostFX_();
      // initializeMap_();
      // initializeAudio_();

      // raf_();
      onWindowResize_();

      socket_?.on('current-map', (mapName) => {
        console.log(`Received map change request ${mapName}`);
        initializeMap_(mapName);
      });

      // socket_?.on('player-positions', (players: PlayerPositionApiData[]) => {
      socket_?.on('player-positions', (data) => {
        const decoded = decode(new Uint8Array(data));
        const players = decoded as Array<
          [string, string, number, number, number, number, number, number, number, boolean, boolean]
        >;

        let localPlayerData: PlayerPositionApiData[] = [];

        for (const player of players) {
          const [SteamId, Name, ox, oy, oz, lx, ly, lz, Team, IsAlive, SpectatingC4] = player;

          // Cast to PlayerData interface
          const playerData: PlayerPositionApiData = {
            SteamId,
            Name,
            // The server plugin scales our Origin/LookAt floats to integers so that we're not dealing with decimals
            // Now we need to scale them down
            OriginX: ox / 10000,
            OriginY: oy / 10000,
            OriginZ: oz / 10000,
            LookAtX: lx / 10000,
            LookAtY: ly / 10000,
            LookAtZ: lz / 10000,
            Team,
            IsAlive,
            SpectatingC4,
          };
          localPlayerData.push(playerData);
        }
        playerPositions = localPlayerData;

        // TODO: if (not connected... || is not in a room...)
        // console.log(players);
        // if (!joinedRoom) {
        //   return;
        // }

        // const mySocketId = socket_?.id;
        // if (!mySocketId) {
        //   return;
        // }
        // if (socketClientMap[mySocketId]) {
        //   return;
        // }

        const me = localPlayerData.find((player) => player.SteamId === getSteamId());

        let spectatedPlayerPosition: THREE.Vector3;

        // Get the position of the player being spectated
        for (const player of localPlayerData) {
          if (player.SteamId === getSteamId()) {
            if (!me.IsAlive) {
              const playerOrigin = new THREE.Vector3(
                player.OriginX,
                player.OriginY,
                player.OriginZ,
              );
              spectatedPlayerPosition = playerOrigin;
              break;
            }
          }
        }

        for (const player of localPlayerData) {
          const steamId = player.SteamId;
          const playerOrigin = new THREE.Vector3(player.OriginX, player.OriginY, player.OriginZ);
          const playerLookAt = new THREE.Vector3(player.LookAtX, player.LookAtY, player.LookAtZ);

          const transformedOrigin = transformVector(playerOrigin);
          const transformedLookAt = transformVector(playerLookAt);

          // TODO: will tweening the camera to the next position smooth out the audio glitches?
          // new TWEEN.Tween(camera_.position)
          //   .to(position, 1)
          //   .easing(TWEEN.Easing.Cubic)
          //   .start();

          if (steamId === getSteamId()) {
            clientCamera.position.set(
              transformedOrigin.x,
              transformedOrigin.y,
              transformedOrigin.z,
            );
            clientCamera.lookAt(transformedLookAt);
          } else {
            const positionalSound = sounds_.get(steamId);

            if (!positionalSound) {
              continue;
            }

            if (
              !player.IsAlive && // player is dead
              (me.IsAlive || // mute if im alive (don't want to hear any dead players)
                player.Team !== me.Team) && // or if the player is an enemy
              !player.SpectatingC4 // and if they're not spectating the c4
            ) {
              positionalSound.Mute(1000); // TODO: the delay should be dynamically set directly from the cs2 server
            } else {
              positionalSound.Unmute(); // unmute if player is alive, or we're both dead and on the same team
            }

            const sameTeamAndDead = !player.IsAlive && player.Team === me.Team;
            const playerIsBeingSpectated = spectatedPlayerPosition
              ? playerOrigin.distanceTo(spectatedPlayerPosition) <= 10
              : false;

            if (!me.IsAlive && (playerIsBeingSpectated || sameTeamAndDead)) {
              positionalSound.SwitchToMono();
              positionalSound.setMonoHighPassFilterFrequency(player.IsAlive ? 100 : 750);
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

        threejs_.render(scene_, clientCamera);
        if (map_) {
          updateSoundFilters();
        }
      });
    }
  }

  async function initializeMap_(mapName: string = 'de_dust2') {
    // Destroy any previously loaded maps, including its textures

    if (!maps.includes(mapName)) {
      console.log(`Failed to load map: '${mapName}'.glb could not be found.`);
      return;
    }

    if (map_ && scene_) {
      map_.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.isMesh) {
            // console.log('disposing old mesh');
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      scene_.remove(map_);
      map_ = null;
    }

    console.log(`[GLTF] Fetching map blob (${mapName})`);

    const buffer = await window.api.loadMap(mapName);
    const blob = new Blob([buffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);

    console.log('[GLTF] Fetched map. Loading into ThreeJS...');

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        console.log('[GLTF] Loaded into ThreeJS!');
        map_ = gltf.scene;
        map_.scale.set(mapScale_, mapScale_, mapScale_);
        map_.rotation.x = -Math.PI / 2;

        if (scene_) {
          scene_.add(map_);
        }

        // We don't care about textures, but to help see the map, we assign each mesh a random color
        // However we want to re-use textures as much as possible to improve performance
        const materials: THREE.MeshBasicMaterial[] = Array.from({ length: 5 }, () => {
          const hue = Math.random() * 360;
          const pastel = new THREE.Color(`hsl(${hue}, 50%, 50%)`);
          // return new THREE.MeshBasicMaterial({ color: pastel, side: THREE.DoubleSide });
          return new THREE.MeshBasicMaterial({ color: pastel });
        });

        map_.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = materials[Math.floor(Math.random() * materials.length)];
          }
        });
      },
      undefined,
      (err) => {
        console.error('Failed to load GLB:', err);
      },
    );
  }

  const joinRoom_ = (code: string) => {
    // TODO: implement UI
    if (code) {
      roomCode = code;
      initUserMedia();
      window.api.setStoreValue('savedRoomCode', roomCode);
    } else {
      roomCode = null;
      console.log('invalid room code');
      addNotification({
        text: 'Invalid room code',
        position: 'top-center',
        removeAfter: 2500,
        type: 'error',
      });
    }
  };

  const getSteamId = () => {
    return clientSteamId;
  };

  const initUserMedia = () => {
    const noiseSuppression = true; // TODO: replace as a user setting
    const echoCancellation = true; // TODO: replace as a user setting
    const sampleRate = import.meta.env.VITE_MEDIA_SAMPLERATE || 48000;
    const sampleSize = import.meta.env.VITE_MEDIA_SAMPLESIZE || 16;
    console.log(`sampleRate: ${sampleRate} | sampleSize: ${sampleSize}`);

    const enableSampleDebug = true;

    // eslint-disable-next-line no-undef
    const audio: MediaTrackConstraintSet = {
      // deviceId: (undefined as unknown) as string,
      autoGainControl: true,
      channelCount: 2,
      echoCancellation: echoCancellation,
      // latency: 0,
      noiseSuppression: noiseSuppression,
      // @ts-ignore - non-standard constraint used by chrome
      googNoiseSuppression: noiseSuppression,
      // @ts-ignore - non-standard constraint used by chrome
      googEchoCancellation: echoCancellation,
      // @ts-ignore - non-standard constraint used by chrome
      googTypingNoiseDetection: noiseSuppression,
      sampleRate: enableSampleDebug ? sampleRate : undefined,
      sampleSize: enableSampleDebug ? sampleSize : undefined,
      deviceId: selectedDeviceId,
    };

    navigator.mediaDevices.getUserMedia({ video: false, audio }).then(
      async (inStream) => {
        let stream = inStream;
        console.log(`Getting user media:`);
        const audioTrack = stream.getAudioTracks()[0];
        console.log(`Device Name: ${audioTrack.label}`);
        console.log(`Device ID: ${audioTrack.getSettings().deviceId}`);

        // const devices = await navigator.mediaDevices.enumerateDevices();
        // const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
        // console.log(audioOutputs);

        // const ac = new AudioContext();
        //TODO: microphone gain
        // const source = ac.createMediaStreamSource(inStream);

        // TODO: what WILL be the difference between stream & inStream
        audioConnectionStuff.stream = stream;
        audioConnectionStuff.instream = inStream;

        // TODO: toggleMute handler
        audioConnectionStuff.toggleMute = (muted: boolean) => {
          audioConnectionStuff.muted = muted;
          if (audioConnectionStuff.deafened) {
            audioConnectionStuff.deafened = false;
            audioConnectionStuff.muted = false;
          }
          inStream.getAudioTracks()[0].enabled =
            !audioConnectionStuff.muted && !audioConnectionStuff.deafened;
          // setMuted(audioConnectionStuff.current.muted);
          // setDeafened(audioConnectionStuff.current.deafened);
        };

        // audioElements = {};
        // TODO: call connect() when our lobby room code has been provided
        // connect(currentLobby, )
        connect(roomCode!, getSteamId()!, getSteamId()!, false);

        const createPeerConnection = (peer: string, initiator: boolean, client: Client) => {
          console.log('CreatePeerConnection: ', peer, initiator, stream);
          console.log(`Using turn config:`, import.meta.env.VITE_USE_TURN_CONFIG);
          const useTurnConfig = true;
          // disconnectClient(client); // TODO:

          // eslint-disable-next-line no-undef
          const ICE_CONFIG_TURN: RTCConfiguration = {
            iceTransportPolicy: 'relay', // protect IPs
            iceServers: [
              {
                urls: 'turn:turn.cs2voiceproximity.chat',
                username: turnUsername,
                credential: turnPassword,
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
            trickle: false,
          });

          // setPeerConnections((connections) => {
          //   connections[peer] = connection;
          //   return connections;
          // });
          peerConnections[peer] = connection;
          socketClientMap[peer] = client;
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
            console.log('receiving connection signal');
            socket_?.emit('signal', {
              data,
              to: peer,
            });
          });

          connection.on('stream', async (stream: MediaStream) => {
            console.log(
              `ONSTREAM: my steamid is: ${getSteamId()} incoming steamid: ${client.steamId}`,
            );
            console.log(`ONSTREAM: my socker id is: ${socket_?.id} incoming socketId: ${peer}`);
            // Map incoming steamid to socket
            steamIdSocketMap[client.steamId] = peer;
            // Map incoming socket to client (steamid)
            socketClientMap[peer] = client;
            console.log(`on stream: Assigning ${peer} to ${client.steamId}`);
            initialiseRemotePlayer_(stream, client);
          });

          connection.on('error', () => {
            console.log('ONERROR');
            console.log('Attempting to reconnect');

            // cleanupUser(peer, client);
            // createPeerConnection(peer, true, client);

            // TODO: play a disconnect sound effect so that user is aware mid game
            queueNotification({
              text: 'Something weird happened. Please rejoin the room.',
              position: 'top-center',
              removeAfter: 10000,
              type: 'error',
            });
            window.api.reloadApp();

            //TODO: refetch turn credentials
            //TODO: reconnect into room
            // currentLobby = null;
            // connect(roomCode, clientSteamId, clientSteamId, false);
            /*empty*/
          });
          return connection;
        };

        socket_?.on('user-joined', async (peer: string, client: Client) => {
          console.log(`user has joined! ${JSON.stringify(client)}`);

          console.log(`before: ${turnPassword}`);
          await window.api.retrieveTurnCredentials();
          turnUsername = await window.api.getStoreValue('turnUsername');
          turnPassword = await window.api.getStoreValue('turnPassword');
          console.log(`after: ${turnPassword}`);

          createPeerConnection(peer, true, client);
          // setSocketClients((old) => ({ ...old, [peer]: client }));
        });

        socket_?.on('user-left', async (peer: string, client: Client) => {
          console.log(`user has left! ${peer} ${JSON.stringify(client)}`);
          cleanupUser(peer, client);
        });

        const cleanupUser = (peer: string, client: Client) => {
          console.log(`Cleaning up user data for ${client.steamId}`);
          const positionalSound = sounds_.get(client.steamId);
          if (positionalSound) {
            positionalSound.playerVoice3D?.disconnect();
            positionalSound.playerObject?.parent?.remove(positionalSound.playerObject);
            console.log('found sound source removing from scene');
          }

          peerConnections[peer]?.destroy();
          delete peerConnections[peer];
          delete socketClientMap[peer];
        };

        socket_?.on(
          'signal',
          ({ data, from, client }: { data: Peer.SignalData; from: string; client: Client }) => {
            console.log(`received on signal: ${client.steamId} ${from} ${JSON.stringify(data)}`);
            let connection: Peer.Instance;
            // if (!socketClientMap[from]) {
            //   console.warn('SIGNAL FROM UNKOWN SOCKET..');
            //   return;
            // }
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
                  `Failed to initiate peer conencton with ${client.steamId}. ${turnUsername} - ${turnPassword}`,
                );
              }
            }
          },
        );
      },
      (error) => {
        console.error(`Could not connect to user media (microphone)`);
        console.error(error);
      },
    );
  };

  const connect = (lobbyCode: string, playerId: string, clientId: string, isHost: boolean) => {
    console.log('connect called..', lobbyCode);
    // setOtherVAD({});
    // setOtherTalking({}); // probably used for talking indicators?
    if (lobbyCode === 'MENU') {
      // Object.keys(peerConnections).forEach((k) => {
      //   disconnectPeer(k);
      // });
      // setSocketClients({});
      socketClientMap = {};
      currentLobby = lobbyCode;
    } else if (currentLobby !== lobbyCode) {
      console.log('Currentlobby', currentLobby, lobbyCode);
      // socket_?.emit('leave');
      // socket_?.emit('id', playerId, clientId);
      console.log(lobbyCode, playerId, clientId, isHost);

      const joinRoomPayload = {
        token: clientToken,
        roomCode: lobbyCode,
        steamId: playerId,
        clientId: clientId,
        isHost: isHost,
      };

      socket_?.emit('join-room', joinRoomPayload, (response: JoinRoomResponse) => {
        // TODO: we should validate there are no duplicate steamIds trying to join

        console.log(response);
        if (response.success) {
          currentLobby = lobbyCode;
          document.querySelector('#threejs').innerHTML = '';
          initializeRenderer_();
          initializeMap_(response.mapName);
          joinedRoom = true;
        } else {
          roomCode = null;
          currentLobby = null;
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

  const updateSoundFilters = () => {
    for (const soundData of sounds_.values()) {
      soundData.updateOcclusion(map_);
    }
  };

  const initialiseRemotePlayer_ = (remoteStream: MediaStream, client: Client) => {
    const remotePlayer = new RemotePlayer(remoteStream, client, clientCamera, scene_, listener_);
    sounds_.set(client.steamId, remotePlayer);
    console.log(`Creating remote player: ${client.steamId}`);
  };

  const initializeRenderer_ = () => {
    // threejs_.shadowMap.enabled = true;
    // threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    // threejs_.setPixelRatio(window.devicePixelRatio);
    // threejs_.setSize(window.innerWidth, window.innerHeight);
    // threejs_.physicallyCorrectLights = true;
    threejs_.autoClear = false;

    const threeJsDom = document.querySelector('#threejs');
    threeJsDom.appendChild(threejs_.domElement);
    // window.addEventListener(
    //   'resize',
    //   () => {
    //     onWindowResize_();
    //   },
    //   false
    // );
  };

  const onWindowResize_ = () => {
    // camera_.aspect = window.innerWidth / window.innerHeight;
    // camera_.updateProjectionMatrix();
    // uiCamera_.left = -camera_.aspect;
    // uiCamera_.right = camera_.aspect;
    // uiCamera_.updateProjectionMatrix();
    // threejs_.setSize(window.innerWidth, window.innerHeight);
  };

  // const raf_ = () => {
  //   requestAnimationFrame((t) => {
  //     if (previousRAF_ === null) {
  //       previousRAF_ = t;
  //     }

  //     threejs_.render(scene_, fpsCamera_.camera_);

  //     if (map_) {
  //       updateSoundFilters();
  //     }
  //     console.log(Math.floor(Date.now() / 1000));

  //     previousRAF_ = t;
  //     raf_();
  //   });
  // };

  // const raf_ = () => {
  //   setTimeout(() => {
  //     const t = performance.now();

  //     if (previousRAF_ === null) {
  //       previousRAF_ = t;
  //     }

  //     threejs_.render(scene_, fpsCamera_.camera_);

  //     if (map_) {
  //       updateSoundFilters();
  //     }

  //     console.log(Math.floor(Date.now() / 1000));

  //     previousRAF_ = t;
  //     raf_();
  //   }, 1000 / 120);
  // };

  let mapName: string = 'de_dust2';

  const joinRoom = (): void => {
    // const roomCode = (document.getElementById('room-code') as HTMLInputElement).value;
    const roomCode = roomCodeInput;
    console.log(`Attempting to join room code ${roomCode}`);

    joinRoom_(roomCode);

    // if (isConnected) {
    //   initializeMap_(mapName);
    // }
  };

  const onMapChange = () => {
    console.log(mapName);
    if (!isConnected) {
      console.log('Waiting for room connection before loading map.');
      return;
    }
    initializeMap_(mapName);
  };

  let isConnected = false;

  // example: poll connection
  const checkConnection = () => {
    isConnected = joinedRoom;
  };

  setInterval(checkConnection, 500);

  async function getDevices() {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    devices = allDevices.filter((device) => device.kind === 'audioinput');
    if (devices.length > 0) {
      selectedDeviceId = devices[0].deviceId; // Default to the first device
    }
  }

  onMount(() => {
    threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    intialise();
    getDevices();
    //TODO: can fire an event from main -> renderer? instead of checking every few seconds
    const interval = setInterval(intialise, 1000);

    // Cleanup the interval when the component is destroyed
    onDestroy(() => {
      clearInterval(interval);
    });
    getSavedRoomCode();
    checkNotifications();

    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
  });

  async function checkNotifications() {
    const notification = await window.api.getStoreValue('notification');
    if (notification) {
      addNotification(notification);
      window.api.setStoreValue('notification', null);
    }
  }

  async function getSavedRoomCode() {
    roomCodeInput = await window.api.getStoreValue('savedRoomCode');
  }

  // Allows debugging of steam auth, still requires a valid jwt
  (window as any).saveAuth = function (steamId: string, jwt: string) {
    window.api.setStoreValue('steamId', steamId);
    window.api.setStoreValue('token', jwt);
  };

  (window as any).debugRenderer = function () {
    console.log(threejs_.info);
  };

  // (window as any).debugSocket = function () {
  //   console.log(socket_);
  // };

  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping');
</script>

<!-- <a target="_blank" rel="noreferrer" on:click={ipcHandle}>Send IPC</a> -->

<!-- TODO: devices will go on a settings page, requiring an app refresh to get user media again -->

<CogSolid
  onclick={() => {
    settingsOpen = !settingsOpen;
  }}
  color={settingsOpen ? 'var(--color-primary-600)' : 'grey'}
  class={cn(
    'cursor-pointer absolute bottom-2 right-2 z-20 select-none transition-all duration-300',
    settingsOpen ? 'rotate-90' : 'rotate-0',
  )}
  size="xl"
/>

{#if !microphoneMuted}
  <MicrophoneSolid
    onclick={() => {
      muteMicrophone();
    }}
    color="grey"
    class={cn(
      'cursor-pointer absolute bottom-2 left-2 z-20 select-none transition-all duration-300',
    )}
    size="xl"
  />
{/if}

{#if microphoneMuted}
  <MicrophoneSlashSolid
    onclick={() => {
      unmuteMicrophone();
    }}
    color="red"
    class={cn(
      'cursor-pointer absolute bottom-2 left-2 z-20 select-none transition-all duration-300',
    )}
    size="xl"
  />
{/if}

<SettingsOverlay
  bind:open={settingsOpen}
  {selectedDeviceId}
  {isConnected}
  {devices}
  bind:mapName
  {onMapChange}
  {clientSteamId}
  {socketUrl}
/>
<div class="p-5">
  <div class="text-center">
    <Heading tag="h1" class="mb-4 text-2xl font-extrabold md:text-5xl lg:text-6xl "
      >CS2 Proximity Chat</Heading
    >
  </div>
  {#if clientSteamId}
    {#if !socketConnected}
      <Alert color="yellow" class="text-center mb-4">
        <span class="font-medium">Connecting to the backend service...</span>
      </Alert>
    {/if}

    {#if !turnUsername || !turnPassword}
      <Alert color="orange" class="text-center mb-4">
        <span class="font-medium">Failed to fetch TURN credentials.</span>
        <p>Please try logging out and back in, restarting the app, or try again later.</p>
      </Alert>
    {/if}
    <div>
      <Label for="room-code" class="mb-2">Room Code:</Label>

      <ButtonGroup class="w-full">
        <Input
          id="room-code"
          name="room-code"
          disabled={isConnected || !socketConnected}
          bind:value={roomCodeInput}
          placeholder="Room code"
        />
        <Button
          color="primary"
          class="cursor-pointer"
          type="submit"
          onclick={joinRoom}
          disabled={isConnected || !socketConnected || !turnUsername || !turnPassword}
        >
          Join</Button
        >
      </ButtonGroup>
    </div>

    <div class="m-2 overflow-hidden">
      <div class=" dark:bg-gray-900" id="threejs"></div>
    </div>

    {#if !!roomCode}
      <PlayerList
        mySteamId={clientSteamId}
        players={playerPositions}
        joinedSocketConnections={socketClientMap}
      ></PlayerList>
    {/if}
  {/if}

  <SteamLoginButton {clientSteamId} />
  <!-- <div style="border: 1px solid lime">
<canvas bind:this={canvas} width="300" height="25"></canvas>
</div> -->
</div>
