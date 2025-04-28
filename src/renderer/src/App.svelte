<script lang="ts">
  // import Versions from './components/Versions.svelte';
  // import electronLogo from './assets/electron.svg';

  import * as THREE from 'three';
  import { GLTFLoader } from 'three-stdlib';
  import { io, Socket } from 'socket.io-client';
  import Peer from 'simple-peer';
  import type { CsTeam } from './type';

  import { onDestroy, onMount } from 'svelte';

  let clientSteamId: string | null;
  async function getStoredSteamId() {
    clientSteamId = await window.api.getStoreValue('steamId');
  }

  onMount(() => {
    getStoredSteamId();

    const interval = setInterval(getStoredSteamId, 5000);

    // Cleanup the interval when the component is destroyed
    onDestroy(() => {
      clearInterval(interval);
    });
  });
  // import TWEEN from '@tweenjs/tween.js';

  // Transform Source2 coordinate to Three.js (Z is up/down)
  // Keeping in mind that we've also rotated our map on the X axis - but only Y & Z need transforming
  // NOTE: .glb blender exports must have the "+Y up" option DISABLED
  function transformVector(input: THREE.Vector3) {
    return new THREE.Vector3(input.x, input.z, input.y * -1);
  }

  class FirstPersonCamera {
    public camera_: THREE.PerspectiveCamera;

    public position_: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public lookAt_: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

    constructor(camera: THREE.PerspectiveCamera) {
      this.camera_ = camera;
    }

    update() {
      this.updatePosition_();
      this.updateAngles_();
    }

    updatePosition_() {
      //TODO: does the scaling of coordinates actually work?
      const position = transformVector(this.position_);
      this.camera_.position.copy(position);

      // TODO: will tweening the camera to the next position smooth out the audio glitches?
      // new TWEEN.Tween(this.camera_.position)
      //   .to(position, 1)
      //   .easing(TWEEN.Easing.Cubic)
      //   .start();
    }

    updateAngles_() {
      const lookAt = transformVector(this.lookAt_);
      this.camera_.lookAt(lookAt);
    }
  }

  class SocketData {
    public socket_: Socket;
    public players_: any[];
    constructor(wsUrl: string) {
      this.socket_ = io(wsUrl);
      this.players_ = [];
      this.initialise_();
    }
    initialise_() {
      // this.socket_.on("user-joined", (id) => {
      //   console.log('joined room')
      // });
    }

    socketFire_JoinRoom(roomCode: string) {
      this.socket_.emit('join-room', roomCode);
    }

    sockerFire_SubmitSteamId(steamid: string) {
      this.socket_.emit('submit-steamid', steamid);
    }
  }

  class SoundSourceData {
    // TODO: if this doesnt work, this is renamed to ListenerData
    private lowPassFilter_?: BiquadFilterNode;
    private lowPassAmount?: number;
    private highPassFilter_?: BiquadFilterNode;
    private highPassAmount?: number;

    public sound_?: THREE.PositionalAudio;
    private listener_?: THREE.AudioListener;
    public steamId?: string;
    public soundObjSource_?: THREE.Object3D; // TODO: THREE.Mesh?
    public camera_?: THREE.Camera;

    private isMuted: boolean = false;

    public Mute() {
      if (!this.isMuted) {
        this.isMuted = true;
        setTimeout(() => {
          this.sound_?.setVolume(0);
        }, 50);
      }
    }

    public Unmute() {
      if (this.isMuted || this.sound_?.getVolume() == 0) {
        this.isMuted = false;
        // this.sound_?.setVolume(0.85); // TODO: use constant for volume (or even the preference of the listener)

        // fade the volume back up (attempt to prevent glitches)
        const targetVolume = 1;
        const fadeDuration = 1000;
        const step = (targetVolume - (this.sound_?.getVolume() || 0)) / (fadeDuration / 16);

        let currentVolume = this.sound_?.getVolume() || 0;
        const fadeIn = setInterval(() => {
          currentVolume += step;
          if (currentVolume >= targetVolume) {
            currentVolume = targetVolume;
            clearInterval(fadeIn);
          }
          this.sound_?.setVolume(currentVolume);
        }, 16);
      }
    }

    constructor(
      sound: THREE.PositionalAudio,
      soundObjSource: THREE.Object3D, // TODO: THREE.Mesh?
      listener: THREE.AudioListener,
      camera: THREE.Camera,
    ) {
      this.sound_ = sound;
      this.listener_ = listener;
      this.soundObjSource_ = soundObjSource;
      this.camera_ = camera;
      // this.steamId = null; // ? maybe?
      // this.intialise_();

      const filter = this.listener_.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0;
      // filter.frequency.setValueAtTime(25000, this.listener_.context.currentTime);
      // filter.gain.setValueAtTime(25, this.listener_.context.currentTime);

      this.lowPassFilter_ = filter;
      // this.sound_.setFilter(filter);

      const highpass = this.listener_.context.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.Q.value = 0;
      highpass.frequency.value = 100;
      // highpass.frequency.setValueAtTime(100, this.listener_.context.currentTime);
      // highpass.gain.setValueAtTime(25, this.listener_.context.currentTime);

      this.highPassFilter_ = highpass;

      this.sound_.setFilters([highpass, filter]);
    }

    private setFilterFrequency(filter: BiquadFilterNode | undefined, amount: number) {
      if (!filter || !Number.isFinite(amount) || !this.listener_) {
        return;
      }
      if (!Number.isFinite(filter.frequency.value)) {
        return;
      }

      if (filter.type == 'lowpass') {
        if (this.lowPassAmount == amount) {
          return;
        }
        this.lowPassAmount = amount;
      }

      if (filter.type == 'highpass') {
        if (this.highPassAmount == amount) {
          return;
        }
        this.highPassAmount = amount;
      }

      const now = this.listener_.context.currentTime;
      filter.frequency.cancelScheduledValues(now);
      // this.lowPassFilter_.frequency.setValueAtTime(this.lowPassFilter_.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(amount, now + 0.05); // smooth over 200ms
    }

    public setLowPassFilterFrequency(amount: number) {
      this.setFilterFrequency(this.lowPassFilter_, amount);
    }

    public setHighPassFilterFrequency(amount: number) {
      this.setFilterFrequency(this.highPassFilter_, amount);
    }

    // TODO: occlusion calculations here
  }

  interface AudioConnectionStuff {
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

  interface Client {
    steamId: string;
    clientId: string; // this would have to be unique to the players PC?
  }

  interface SocketClientMap {
    [socketId: string]: Client;
  }

  interface SteamIdSocketMap {
    [steamId: string]: string;
  }

  interface PeerConnections {
    [peer: string]: Peer.Instance;
  }

  interface PlayerPositionApiData {
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

  // eslint-disable-next-line no-undef
  const DEFAULT_ICE_CONFIG: RTCConfiguration = {
    iceTransportPolicy: 'all',
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  };

  // TODO: Uncaught ReferenceError: process is not defined
  // eslint-disable-next-line no-undef
  const DEFAULT_ICE_CONFIG_TURN: RTCConfiguration = {
    iceTransportPolicy: 'relay', // protect IPs
    iceServers: [
      {
        urls: 'stun:stun.relay.metered.ca:80',
      },
      {
        urls: 'turn:oceania.relay.metered.ca:80',
        username: '96cfcb96272c895a9dbf7f90',
        credential: 'YN9b9HCsFuc07FpF',
      },
      {
        urls: 'turn:oceania.relay.metered.ca:80?transport=tcp',
        username: '96cfcb96272c895a9dbf7f90',
        credential: 'YN9b9HCsFuc07FpF',
      },
      {
        urls: 'turn:oceania.relay.metered.ca:443',
        username: '96cfcb96272c895a9dbf7f90',
        credential: 'YN9b9HCsFuc07FpF',
      },
      {
        urls: 'turns:oceania.relay.metered.ca:443?transport=tcp',
        username: '96cfcb96272c895a9dbf7f90',
        credential: 'YN9b9HCsFuc07FpF',
      },
    ],
  };

  class FirstPersonCameraDemo {
    private fpsCamera_: FirstPersonCamera;

    private socket_?: SocketData;

    private previousRAF_: any;
    private mapScale_: number;

    private map_?: THREE.Group<THREE.Object3DEventMap>;
    private scene_: THREE.Scene;
    // private uiScene_: THREE.Scene;
    private sounds_: SoundSourceData[];

    private camera_: THREE.PerspectiveCamera;
    // private uiCamera_: THREE.OrthographicCamera;

    private threejs_: THREE.WebGLRenderer;

    private listener_: THREE.AudioListener;

    // TODO: this will be later used to create new player objects/meshes that we will attach
    // private soundSourceObjects: any[] = [];

    // private steamId?: string;
    private roomCode?: string;

    private audioConnectionStuff: AudioConnectionStuff;

    // is this "player incoming audio streams?"
    // private audioElements: AudioElements = {};
    private currentLobby = '';
    // i hate all of this
    private socketClientMap: SocketClientMap = {};
    private steamIdSocketMap: SteamIdSocketMap = {};
    private peerConnections: PeerConnections = {};

    constructor() {
      this.audioConnectionStuff = {
        deafened: false,
        muted: false,
        toggleMute: () => {
          /*empty*/
        },
        toggleDeafen: () => {
          /*empty*/
        },
      };

      this.threejs_ = new THREE.WebGLRenderer({
        antialias: false,
      });

      this.scene_ = new THREE.Scene();
      // const ambient = new THREE.AmbientLight(0xffffff, 1);
      // this.scene_.add(ambient);

      this.listener_ = new THREE.AudioListener();

      const fov = 60;
      const aspect = 1920 / 1080;
      const near = 1.0;
      const far = 2000.0;
      this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this.camera_.position.set(-30, 2, 0);

      // this.uiCamera_ = new THREE.OrthographicCamera(-1, 1, 1 * aspect, -1 * aspect, 1, 1000);
      // this.uiScene_ = new THREE.Scene();

      this.fpsCamera_ = new FirstPersonCamera(this.camera_);
      this.socket_ = new SocketData(import.meta.env.VITE_SOCKET_URL);

      this.sounds_ = [];
      this.initialize_();
      // const mapScale = 39.3701;
      // this.mapScale_ = 5;
      this.mapScale_ = 39.3701;
      this.previousRAF_ = null;
      this.raf_();
      this.onWindowResize_();
    }

    joinRoom_() {
      do {
        // TODO: implement UI
        // const code = window.prompt('Enter room code:');
        const code = '123';
        if (code) {
          this.roomCode = code;

          setTimeout(() => {
            this.initUserMedia();
          }, 1000);

          // // console.log(this.socket_)
          // // TODO: we can do a single emit with both code+steamid, but we probably want to store the steamid first in localstorage
          // this.socket_?.socket_.emit("join-room", this.roomCode, this.getSteamId(), (response) => {
          //   if (response.error) {
          //     //TODO: the server will send a connect_failed event that we should catch separately on the client side
          //     console.log(`error from socket ${response.error}`)
          //     this.roomCode = undefined;
          //     alert("This room doesn't exist!");
          //     return;
          //   }
          //   console.log(`response: ${response}`)

          // });
        } else {
          alert('Invalid room code');
        }
      } while (!this.roomCode);
    }

    // submitSteamId() {
    //   while (!this.steamId) {
    //     if (steam) {
    //       this.steamId = steam;
    //       this.socket_?.sockerFire_SubmitSteamId(this.steamId);
    //     } else {
    //       // TODO: we could actually validate the steamId64, or convert it from steamid32
    //       alert("Invalid steamId")
    //     }
    //   }
    // }

    getSteamId() {
      return clientSteamId;
      // return window.localStorage.getItem(`steamid`) || null;
    }

    initUserMedia() {
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
        // googNoiseSuppression: noiseSuppression,// @ts-ignore-line eslint-disable-line
        // googEchoCancellation: echoCancellation,// @ts-ignore-line
        // googTypingNoiseDetection: noiseSuppression,
        sampleRate: enableSampleDebug ? sampleRate : undefined,
        sampleSize: enableSampleDebug ? sampleSize : undefined,
      };

      navigator.mediaDevices.getUserMedia({ video: false, audio }).then(
        async (inStream) => {
          console.log('getting user media');
          let stream = inStream;
          // const ac = new AudioContext();
          //TODO: microphone gain
          // const source = ac.createMediaStreamSource(inStream);

          // TODO: what WILL be the difference between stream & inStream
          this.audioConnectionStuff.stream = stream;
          this.audioConnectionStuff.instream = inStream;

          // TODO: toggleMute handler
          this.audioConnectionStuff.toggleMute = () => {
            this.audioConnectionStuff.muted = !this.audioConnectionStuff.muted;
            if (this.audioConnectionStuff.deafened) {
              this.audioConnectionStuff.deafened = false;
              this.audioConnectionStuff.muted = false;
            }
            inStream.getAudioTracks()[0].enabled =
              !this.audioConnectionStuff.muted && !this.audioConnectionStuff.deafened;
            // setMuted(this.audioConnectionStuff.current.muted);
            // setDeafened(this.audioConnectionStuff.current.deafened);
          };

          // this.audioElements = {};
          // TODO: call this.connect() when our lobby room code has been provided
          // this.connect(this.currentLobby, )
          this.connect(this.roomCode!, this.getSteamId()!, this.getSteamId()!, false);

          const createPeerConnection = (peer: string, initiator: boolean, client: Client) => {
            console.log('CreatePeerConnection: ', peer, initiator, stream);
            // disconnectClient(client); // TODO:
            const connection = new Peer({
              stream,
              initiator, // @ts-ignore-line
              iceRestartEnabled: true,
              config: import.meta.env.VITE_USE_TURN_CONFIG === true ? DEFAULT_ICE_CONFIG_TURN : DEFAULT_ICE_CONFIG,
              // config: settingsRef.current.natFix ? DEFAULT_ICE_CONFIG_TURN : iceConfig,
              // config: DEFAULT_ICE_CONFIG,
            });

            // setPeerConnections((connections) => {
            //   connections[peer] = connection;
            //   return connections;
            // });
            this.peerConnections[peer] = connection;
            this.socketClientMap[peer] = client;

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

            connection.on('signal', (data) => {
              console.log('receiving connection signal');
              this.socket_?.socket_.emit('signal', {
                data,
                to: peer,
              });
            });

            connection.on('stream', async (stream: MediaStream) => {
              console.log(`ONSTREAM: my steamid is: ${this.getSteamId()} incoming steamid: ${client.steamId}`);
              console.log(`ONSTREAM: my socker id is: ${this.socket_?.socket_.id} incoming socketId: ${peer}`);
              // Map incoming steamid to socket
              this.steamIdSocketMap[client.steamId] = peer;
              // Map incoming socket to client (steamid)
              this.socketClientMap[peer] = client;
              this.initialiseRemotePlayer_(stream, client);
            });

            connection.on('error', () => {
              console.log('ONERROR');
              /*empty*/
            });
            return connection;
          };

          this.socket_?.socket_.on('user-joined', async (peer: string, client: Client) => {
            console.log('user has joined!');
            createPeerConnection(peer, true, client);
            // setSocketClients((old) => ({ ...old, [peer]: client }));
          });

          this.socket_?.socket_.on(
            'signal',
            ({ data, from, client }: { data: Peer.SignalData; from: string; client: Client }) => {
              console.log(`received on signal: ${JSON.stringify(data)}`);
              let connection: Peer.Instance;
              // if (!socketClientsRef.current[from]) {
              //   console.warn('SIGNAL FROM UNKOWN SOCKET..');
              //   return;
              // }
              if (Object.prototype.hasOwnProperty.call(data, 'type')) {
                if (this.peerConnections[from] && data.type !== 'offer') {
                  connection = this.peerConnections[from];
                } else {
                  connection = createPeerConnection(from, false, client);
                }
                connection.signal(data);
              }
            },
          );
        },
        (error) => {
          console.error(`Could not connect to user media (microphone)`);
          console.error(error);
        },
      );
    }

    connect = (lobbyCode: string, playerId: string, clientId: string, isHost: boolean) => {
      console.log('connect called..', lobbyCode);
      // setOtherVAD({});
      // setOtherTalking({}); // probably used for talking indicators?
      if (lobbyCode === 'MENU') {
        // Object.keys(peerConnections).forEach((k) => {
        //   disconnectPeer(k);
        // });
        // setSocketClients({});
        this.socketClientMap = {};
        this.currentLobby = lobbyCode;
      } else if (this.currentLobby !== lobbyCode) {
        console.log('Currentlobby', this.currentLobby, lobbyCode);
        this.socket_?.socket_.emit('leave');
        // this.socket_?.socket_.emit('id', playerId, clientId);
        console.log(lobbyCode, playerId, clientId, isHost);

        // TODO: we should absolutely send our signed JWT in this join-room attempt to validate and pair the socket id with steam id
        this.socket_?.socket_.emit('join-room', lobbyCode, playerId, clientId, isHost);
        this.currentLobby = lobbyCode;
      }
    };

    initialize_() {
      // TODO: wait for socket connection before moving on..

      while (!this.getSteamId()) {
        // TODO: let's assume the server is already pulling player positions from cs2 server;
        // TODO: we can validate player with this steamid is on the server prior to joining the room
        // TODO: but ideally, we use openId to authenticate the real steam id
        // TODO: maybe this could be a lobby option set by the host? "Validate steamIds", so that trusted friends don't need to all login
        // TODO: the message would say "This steamId needs to be present on the server prior to joining the room"
        // TODO: add UI for prompt
        // const steam = prompt('Enter Steam ID:');
        // const steam = '0';
        // const steam = clientSteamId;
        // if (steam) {
        //   window.localStorage.setItem(`steamid`, steam);
        // }
      }

      setTimeout(() => {
        this.joinRoom_();
      }, 1000);

      this.socket_?.socket_.on('player-positions', (players: PlayerPositionApiData[]) => {
        // TODO: if (not connected... || is not in a room...)
        const mySocketId = this.socket_?.socket_?.id;
        if (!mySocketId) {
          return;
        }
        if (this.socketClientMap[mySocketId]) {
          return;
        }
        // this.socket_?.socketCallback_GetPlayerPositions(players, this.socketClientMap, this.steamIdSocketMap, this.getSteamId());
        // players.forEach((player) => {

        for (const player of players) {
          const steamId = player.SteamId;
          const playerOrigin = new THREE.Vector3(player.OriginX, player.OriginY, player.OriginZ);
          const playerLookAt = new THREE.Vector3(player.LookAtX, player.LookAtY, player.LookAtZ);
          if (steamId === this.getSteamId()) {
            // these vectors are transformed with updatePosition()
            // this.setMyCameraPositionData_(playerOrigin, playerLookAt);\
            this.fpsCamera_.position_.copy(new THREE.Vector3(player.OriginX, player.OriginY, player.OriginZ));
            this.fpsCamera_.lookAt_.copy(new THREE.Vector3(player.LookAtX, player.LookAtY, player.LookAtZ));
            // console.log(`SAVING our own steam id ${this.getSteamId()} Position=${JSON.stringify(playerOrigin)} LookAt=${JSON.stringify(playerLookAt)}`)

            // TODO: we cant use .enabled = false because we need dead players to communicate to each other
            // if (this.audioConnectionStuff?.instream?.getAudioTracks()?.[0]) {
            //   if (!player.IsAlive) {
            //     this.audioConnectionStuff.instream.getAudioTracks()[0].enabled = false;
            //   } else {
            //     this.audioConnectionStuff.instream.getAudioTracks()[0].enabled = true;
            //   }
            // }
          } else {
            for (const positionalSound of this.sounds_) {
              if (positionalSound.steamId !== steamId) {
                continue;
              }

              if (!player.IsAlive) {
                positionalSound.Mute();
                // positionalSound.soundObjSource_?.position.set(-9000, -9000, -9000);
                // continue;
              } else {
                positionalSound.Unmute();
              }

              const transformedOrigin = transformVector(playerOrigin);
              const transformedLookAt = transformVector(playerLookAt);
              if (positionalSound.soundObjSource_) {
                // positionalSound.soundObjSource_?.position.copy(playerOrigin);
                positionalSound.soundObjSource_?.position.set(
                  transformedOrigin.x,
                  transformedOrigin.y,
                  transformedOrigin.z,
                );
                positionalSound.soundObjSource_?.lookAt(transformedLookAt);
                // console.log(`Found steam: ${steamId}. Position=${JSON.stringify(playerOrigin)} LookAt=${JSON.stringify(playerLookAt)}`);
                // console.log(`Found steam: ${steamId}. Position=${JSON.stringify(transformedOrigin)} LookAt=${JSON.stringify(transformedLookAt)}`);
              } else {
                console.warn(`No soundObjSource for steam ${steamId}`);
              }
              // break; // TODO: we should validate there are no duplicate steamIds trying to join
            }
          }
        }

        // });
      });

      // TODO: don't initialize map until we have joined a room

      // Now you can use roomCode and steamId
      this.initializeRenderer_();
      this.initializeScene_();
      // this.initializePostFX_();
      this.initializeMap_();
      this.initializeAudio_();
    }

    initializeMap_() {
      const mapFilePath = `/maps/de_dust2.glb`;
      const loader = new GLTFLoader();
      loader.load(
        `${mapFilePath}`,
        (gltf) => {
          this.map_ = gltf.scene;
          this.map_.scale.set(this.mapScale_, this.mapScale_, this.mapScale_);
          this.map_.rotation.x = -Math.PI / 2;
          if (this.scene_) {
            this.scene_.add(this.map_);
          }

          // We don't care about textures, but to help see the map, we assign each mesh a random color
          this.map_.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const hue = Math.random() * 360;
              const pastel = new THREE.Color(`hsl(${hue}, 50%, 50%)`);
              child.material = new THREE.MeshBasicMaterial({
                color: pastel,
                side: THREE.DoubleSide, // raycast won't register if we hit a mesh from the other side
              });
            }
          });
        },
        undefined,
        (err) => {
          console.error('Failed to load GLB:', err);
        },
      );
    }

    updateSoundFilters() {
      // TODO: should this.sounds_ should be a map using the peer connections as the index?
      for (const soundData of this.sounds_) {
        // console.log('found sound data!');
        // TODO: move calculateOcclusion code inside of SoundSourceData
        const { occlusion } = this.calculateOcclusion(soundData.camera_?.position, soundData.soundObjSource_?.position);
        const minimumAmt = 100;
        // const amount = 11000 - occlusion * 11000 + 250;
        const eased = Math.pow(occlusion, 0.25); // sqrt curve
        const amount = minimumAmt + (1 - eased) * (11000 - minimumAmt);
        // console.log(`setting occlusion to ${amount} (${occlusion * 11} hits) extra hits: ${totalExtraHits}`);
        soundData.setLowPassFilterFrequency(amount);

        // const distance = this.calculateDistance(soundData.camera_.position, soundData.soundObjSource_.position);
        // const normalized = THREE.MathUtils.clamp(distance / 1500, 0, 1); // scale to 0–1
        // const eased2 = Math.pow(normalized, 0.25); // slow start, fast rise
        // const minimumHighpass = 0;
        // const highpassAmount = minimumHighpass + eased2 * (24000 - minimumHighpass);
        // if(distance >= 1500 && occlusion >= 0.9){
        //   console.log(`setting highpass to ${highpassAmount} (${distance} units away)`)
        //   soundData.setHighPassFilterFrequency(highpassAmount);
        // }else{
        //   console.log(`setting highpass to 0 (${distance} units away)`)
        //   soundData.setHighPassFilterFrequency(0);
        // }

        // const maxDistance = 2500;
        // const fullAudibleDistance = 1500;
        // const maxHighpass = 24000;
        // const minHighpass = 0;
        // const occlusionThreshold = 0.4;

        const distance = this.calculateDistance(soundData.camera_?.position, soundData.soundObjSource_?.position);

        if (!distance) {
          continue;
        }

        // const normalized = THREE.MathUtils.clamp(distance / maxDistance, 0, 1);
        // const easedDistance = Math.pow(normalized, 5);

        let targetHighpass = 100;

        //TODO: if i see someone from T spawn -> mid on dust 2 i cant hear them (due to occlusion)
        // if (distance > fullAudibleDistance) {
        //   if (occlusion >= 0.9) {
        //     targetHighpass = maxHighpass; // far & occluded → mute
        //   } else if (occlusion < occlusionThreshold) {
        //     targetHighpass = 4000; // far but visible → partially audible
        //   } else {
        //     const t = (occlusion - occlusionThreshold) / (0.9 - occlusionThreshold);
        //     targetHighpass = THREE.MathUtils.lerp(4000, maxHighpass, t);
        //   }
        // } else {
        //   // Close → smoothly fade from clear to partially muffled
        //   // targetHighpass = THREE.MathUtils.lerp(minHighpass, 4000, easedDistance);
        // }

        // TODO: refactor the highpass occlusion
        // - i believe this is what caused the audio glitches
        // - it was being set 0 -> 24000 -> 0 -> 24000.. on a loop.

        // console.log(`setting highpass to ${targetHighpass}`);
        soundData.setHighPassFilterFrequency(targetHighpass);
        // console.log(`setting highpass to ${targetHighpass} (${distance} units away)`)
      }
    }

    calculateDistance(a?: THREE.Vector3, b?: THREE.Vector3) {
      if (a && b) {
        return a.distanceTo(b);
      }
      return null;
    }

    calculateOcclusion(Listener_?: THREE.Vector3, Sound_?: THREE.Vector3) {
      if (!Listener_ || !Sound_) {
        // TODO: interface
        return {
          occlusion: 0,
          totalExtraHits: 0,
        };
      }
      //! if our widening is less than the edges of our player model (32 units on each side); then the ray casts wont go through the walls
      // alternatively we add another layer of meshes inbetween large walls gaps (dust 2 B car to tunnels)
      const SndOcclusonWidening = 31;

      // const Sound = new THREE.Vector3(23.8, -57.1, 0.66);
      // const Listener = new THREE.Vector3(8.18, -55.1, 0.66);
      // console.log(`listener: ${listener.x} ${listener.y} ${listener.z}`)
      // console.log(`sound: ${sound.x} ${sound.y} ${sound.z}`)

      // const Sound_ = new THREE.Vector3(sound.x, sound.z, (sound.y * -1));
      // const Listener_ = new THREE.Vector3(listener.x, listener.z, (listener.y * -1));

      const SoundLeft = this.calculatePoint(Sound_, Listener_, SndOcclusonWidening, true);
      const SoundRight = this.calculatePoint(Sound_, Listener_, SndOcclusonWidening, false);

      const SoundAbove = new THREE.Vector3(Sound_.x, Sound_.y, Sound_.z + SndOcclusonWidening);
      const SoundBelow = new THREE.Vector3(Sound_.x, Sound_.y, Sound_.z - SndOcclusonWidening);

      const ListenerLeft = this.calculatePoint(Listener_, Sound_, SndOcclusonWidening, true);
      const ListenerRight = this.calculatePoint(Listener_, Sound_, SndOcclusonWidening, false);

      const ListenerAbove = new THREE.Vector3(Listener_.x, Listener_.y, Listener_.z + SndOcclusonWidening * 0.5);
      const ListenerBelow = new THREE.Vector3(Listener_.x, Listener_.y, Listener_.z - SndOcclusonWidening * 0.5);

      const line1 = this.didIntersect(SoundLeft, Listener_);
      const line2 = this.didIntersect(SoundLeft, Listener_);
      const line3 = this.didIntersect(SoundLeft, ListenerRight);
      const line4 = this.didIntersect(Sound_, ListenerLeft);
      const line5 = this.didIntersect(Sound_, Listener_);
      const line6 = this.didIntersect(Sound_, ListenerRight);
      const line7 = this.didIntersect(SoundRight, ListenerLeft);
      const line8 = this.didIntersect(SoundRight, Listener_);
      const line9 = this.didIntersect(SoundRight, ListenerRight);
      const line10 = this.didIntersect(SoundAbove, ListenerAbove);
      const line11 = this.didIntersect(SoundBelow, ListenerBelow);
      const lines = [line1, line2, line3, line4, line5, line6, line7, line8, line9, line10, line11];
      let hits = 0;
      for (let line of lines) {
        if (line >= 1) {
          hits += 1;
        }
      }
      if (hits > 0) {
        // console.log(`${hits} / 11 got hit. these equals to ${hits / 11}. setting filter to ${11000 - (hits / 11) * 11000}`);
      }

      let occlusionRatio = hits / 11;
      let totalExtraHits = 0;

      if (occlusionRatio === 1) {
        // Check how many extra hits occurred (i.e. walls behind walls)
        for (let line of lines) {
          if (line > 1) {
            totalExtraHits += line - 1;
          }
        }
        const extraDampening = THREE.MathUtils.clamp(totalExtraHits / 11, 0, 1);
        // Blend between normal full occlusion and extreme occlusion
        // 1 => 100% occluded, 2 => extra occluded (more walls)
        occlusionRatio += extraDampening; // could also weight this if needed
      }

      return { occlusion: hits / 11, totalExtraHits: totalExtraHits };

      // return hits / 11;
    }

    didIntersect(v1: THREE.Vector3, v2: THREE.Vector3) {
      const raycaster = new THREE.Raycaster();
      const dir = v2.clone().sub(v1).normalize();
      raycaster.set(v1, dir);

      if (this.map_ == null) {
        return 0;
      }

      const hits = raycaster.intersectObject(this.map_, true);

      const maxDistance = v1.distanceTo(v2);
      const filteredHits = hits.filter((hit) => hit.distance <= maxDistance);
      // console.log(`Ray hit ${filteredHits.length} objects`);

      filteredHits.forEach((hit) => {
        // console.log(`Hit ${i}: Distance = ${hit.distance.toFixed(2)}, Object = ${hit.object.name}`);

        // Calculate the size of the mesh
        // TODO: we can use this in the future if our walls have thickness, and we can scale our occlusion with the 3d volume of the wall
        if (hit.object instanceof THREE.Mesh) {
          const object = hit.object as THREE.Mesh;
          object.geometry.computeBoundingBox();
          const box = object.geometry.boundingBox;
          const size = new THREE.Vector3();
          if (box) {
            box.getSize(size);
            // console.log("Mesh size:", size);
          }
        }
      });

      return filteredHits.length;
    }

    calculatePoint(a: THREE.Vector3, b: THREE.Vector3, m: number, posOrneg: boolean) {
      const n = new THREE.Vector3(a.x, 0, a.z).distanceTo(new THREE.Vector3(b.x, 0, b.z));
      const mn = m / n;
      let x, z;

      if (posOrneg) {
        x = a.x + mn * (a.z - b.z);
        z = a.z - mn * (a.x - b.x);
      } else {
        x = a.x - mn * (a.z - b.z);
        z = a.z + mn * (a.x - b.x);
      }

      return new THREE.Vector3(x, a.y, z);
    }

    initialisePlayer_() {
      const speaker1Material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const speaker1 = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 4), speaker1Material);
      speaker1.position.set(27.168392, -189.78938 + 64, 664.5947); // mirage top mid
      // speaker1.position.set(319.3484, -39.96875 + 64, 2278.2021); // mirage palace
      // this.speakerMesh1_ = speaker1;

      const sound1 = new THREE.PositionalAudio(this.listener_);
      speaker1.add(sound1);
      const sound1Data = new SoundSourceData(sound1, speaker1, this.listener_, this.camera_);
      if (this.getSteamId()) {
        sound1Data.steamId = this.getSteamId()!;
      } else {
        console.error(`initialising local player without a steam id!`);
      }
      this.sounds_.push(sound1Data);

      this.scene_.add(speaker1);

      // const loader = new THREE.AudioLoader();
      // loader.load("resources/music/Ectoplasm.mp3", (buffer) => {
      //   setTimeout(() => {
      //     sound1.setBuffer(buffer);
      //     sound1.setLoop(true);
      //     sound1.setVolume(0.85);
      //     sound1.setRefDistance(39);
      //     sound1.setRolloffFactor(1);
      //     sound1.setMaxDistance(1000);
      //     sound1.play();
      //     // this.analyzer1_ = new THREE.AudioAnalyser(sound1, 32);
      //     // this.analyzer1Data_ = [];
      //   }, 1000);
      // });
    }

    initialiseRemotePlayer_(remoteStream: MediaStream, client: Client) {
      const speaker1Material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const speaker1 = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 4), speaker1Material);
      speaker1.position.set(27.168392, -189.78938 + 64, 664.5947); // mirage top mid
      // speaker1.position.set(319.3484, -39.96875 + 64, 2278.2021); // mirage palace
      this.scene_.add(speaker1);
      // this.speakerMesh1_ = speaker1;

      const sound1 = new THREE.PositionalAudio(this.listener_);
      sound1.setMediaStreamSource(remoteStream);
      sound1.setVolume(1);
      sound1.setRefDistance(39);
      sound1.setRolloffFactor(1);
      sound1.setMaxDistance(1000);
      speaker1.add(sound1);
      const sound1Data = new SoundSourceData(sound1, speaker1, this.listener_, this.camera_);
      sound1Data.steamId = client.steamId;
      this.sounds_.push(sound1Data);

      console.log('created remote player');
    }

    initializeAudio_() {
      this.camera_.add(this.listener_);
      this.initialisePlayer_();
    }

    initializeScene_() {
      if (!this.scene_) {
        this.scene_ = new THREE.Scene();
      }

      // TODO: if DEBUG is enabled
      const axesHelper = new THREE.AxesHelper(50);
      this.scene_.add(axesHelper);
    }

    initializeRenderer_() {
      // this.threejs_.shadowMap.enabled = true;
      // this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
      // this.threejs_.setPixelRatio(window.devicePixelRatio);
      // this.threejs_.setSize(window.innerWidth, window.innerHeight);
      // this.threejs_.physicallyCorrectLights = true;
      this.threejs_.autoClear = false;

      const threeJsDom = document.querySelector('#threejs');
      threeJsDom.appendChild(this.threejs_.domElement);

      // window.addEventListener(
      //   'resize',
      //   () => {
      //     this.onWindowResize_();
      //   },
      //   false
      // );
    }

    onWindowResize_() {
      // this.camera_.aspect = window.innerWidth / window.innerHeight;
      // this.camera_.updateProjectionMatrix();
      // this.uiCamera_.left = -this.camera_.aspect;
      // this.uiCamera_.right = this.camera_.aspect;
      // this.uiCamera_.updateProjectionMatrix();
      // this.threejs_.setSize(window.innerWidth, window.innerHeight);
    }

    raf_() {
      requestAnimationFrame((t) => {
        if (this.previousRAF_ === null) {
          this.previousRAF_ = t;
        }

        this.step_();
        // this.composer_.render();
        this.threejs_.render(this.scene_, this.fpsCamera_.camera_);

        this.previousRAF_ = t;
        this.raf_();
      });
    }

    setMyCameraPositionData_(origin: THREE.Vector3, lookAt: THREE.Vector3) {
      this.fpsCamera_.position_.copy(origin);
      this.fpsCamera_.lookAt_.copy(lookAt);
    }

    step_() {
      if (this.map_ === null) {
        return;
      }
      // const timeElapsedS = timeElapsed * 0.001;

      // camera position is now updated every time player positions are retrieved
      // this.updateCameraPositionData_();
      this.fpsCamera_.update();
      this.updateSoundFilters();
    }
  }

  let _APP: FirstPersonCameraDemo | null = null;

  window.addEventListener('DOMContentLoaded', () => {
    const _Setup = () => {
      _APP = new FirstPersonCameraDemo();
      document.body.removeEventListener('click', _Setup);
    };
    document.body.addEventListener('click', _Setup);
  });

  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping');
</script>

<!-- <a target="_blank" rel="noreferrer" on:click={ipcHandle}>Send IPC</a> -->
<h3 style="color: white">Your steam id is {clientSteamId || 'N/A'}</h3>

<div id="threejs"></div>

<label for="room-code">Room Code:</label>
<input type="text" id="room-code" name="room-code" />
<button
  type="submit"
  on:click={() => {
    console.log('click');
    document.querySelector('#threejs').innerHTML = '';
  }}>Join</button
>
