import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBatchedBoundsTree,
  computeBoundsTree,
  disposeBatchedBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import type { Client } from '@shared/types/api';
import type { ImpulseResponseType, ReverbZone } from '@shared/types/maps';
import { DEFAULT_SERVER_CONFIG, type ServerConfigData } from '@shared/types/store/server-config';
import { OcclusionQuality } from '@shared/types/store/settings';
import { talkingIndicatorStore } from '@store/talking-indicators';
import { transformVector } from './lib/vector';

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
THREE.BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;

interface OcclusionData {
  occlusion: number; // between 0 - 1.0
  totalExtraHits: number;
}

export class RemotePlayer {
  public playerVoice2D: THREE.Audio;
  public playerVoice3D: THREE.PositionalAudio;
  private useMonoAudio: boolean = false;

  private listener_: THREE.AudioListener;
  public steamId?: string;
  public playerObject?: THREE.Object3D;
  public clientCamera?: THREE.Camera;

  private unmuteTimeout?: NodeJS.Timeout;
  private muteTimeout?: NodeJS.Timeout;
  private isMuted: boolean = false;

  // Filters
  private lowPassFilter_?: BiquadFilterNode;
  private lowPassAmount?: number;

  private highPassFilter_?: BiquadFilterNode;
  private highPassAmount?: number;

  private gainFilter?: GainNode;
  private gainAmount: number;

  private distanceGainFilter?: GainNode;
  private distanceGainAmount: number;

  private monoGainFilter?: GainNode;
  private monoHighpassFilter?: BiquadFilterNode;

  private reverbFilter?: ConvolverNode;
  private impulseBuffers = new Map<ImpulseResponseType, AudioBuffer>();

  private reverbGainFilter?: GainNode;
  private reverbGainAmount: number;

  // Talking indicators
  private readonly minUpdateRate = 50;
  private lastRefreshTime = 0;
  private processor: ScriptProcessorNode;
  private src: MediaStreamAudioSourceNode;
  private ctx: AudioContext;
  public rms: number = 0;
  private dummyGain?: GainNode;
  private occlusionPct: number = 0;

  private remoteStream: MediaStream;

  constructor(
    remoteStream: MediaStream,
    client: Client,
    camera: THREE.Camera,
    scene: THREE.Scene,
    listener: THREE.AudioListener,
  ) {
    const playerObject = new THREE.Mesh(
      new THREE.BoxGeometry(4, 8, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    scene.add(playerObject);

    this.useMonoAudio = false;

    this.listener_ = listener;
    this.playerObject = playerObject;
    this.clientCamera = camera;

    this.remoteStream = remoteStream;

    // Debug positions to set the speaker if it's not attached to any real player positions
    playerObject.position.copy(transformVector(new THREE.Vector3(457.5018, 1833.5608, 136.03122))); // banana half wall CT side
    // playerObject.position.set(27.168392, -189.78938 + 64, 664.5947); // mirage top mid
    // playerObject.position.set(319.3484, -39.96875 + 64, 2278.2021); // mirage palace

    // Needed to make threejs positional audio work with remoteStream
    const audioRef = new Audio();
    audioRef.srcObject = remoteStream;
    audioRef.muted = true;

    const playerVoice3D = new THREE.PositionalAudio(listener); // defaults to "inverse" distance model
    playerVoice3D.setMediaStreamSource(remoteStream);
    playerVoice3D.setVolume(1);

    // Disable distance attenuation controlled by native PannerNode
    playerVoice3D.setDistanceModel('none');
    // playerVoice3D.setRefDistance(Infinity); // https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/refDistance
    playerVoice3D.setRolloffFactor(0); // https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/rolloffFactor

    // playerVoice3D.setMaxDistance(1000); // only used by the "linear" distance model
    playerObject.add(playerVoice3D);
    this.playerVoice3D = playerVoice3D;

    // Used when spectating a player or hearing dead teammates
    const playerVoice2D = new THREE.Audio(listener);
    playerVoice2D.setMediaStreamSource(remoteStream);
    playerVoice2D.setVolume(1);
    scene.add(playerVoice2D);
    playerObject.add(playerVoice2D);
    this.playerVoice2D = playerVoice2D;

    this.steamId = client.steamId;
    this.Mute(0);

    this.gainAmount = 2.5;
    this.distanceGainAmount = 1;
    this.initStereoFilters();
    this.initMonoFilters();

    // Talking indicators
    this.ctx = new AudioContext();
    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    // this.processor.connect(this.ctx.destination);
    this.src = this.ctx.createMediaStreamSource(remoteStream);
    this.src.connect(this.processor);
    this.processor.addEventListener('audioprocess', this.processMediaStream.bind(this));
    // this.src.connect(this.ctx.destination);
    this.dummyGain = this.ctx.createGain();
    this.dummyGain.gain.value = 0;
    this.processor.connect(this.dummyGain);
    this.dummyGain.connect(this.ctx.destination);

    this.reverbGainAmount = 0;
  }

  // Talking indicators
  private processMediaStream(event: AudioProcessingEvent): void {
    // limit update frequency
    if (event.timeStamp - this.lastRefreshTime < this.minUpdateRate) {
      return;
    }

    // update last refresh time
    this.lastRefreshTime = event.timeStamp;

    const input = event.inputBuffer.getChannelData(0);
    const total = input.reduce((acc, val) => acc + Math.abs(val), 0);
    this.rms = Math.min(0.5, Math.sqrt(total / input.length));

    const isTalking = this.rms > 0.05; // adjust threshold
    const steamid = this.steamId;
    talkingIndicatorStore.update((map) => {
      if (steamid) {
        map.set(steamid, {
          isTalking,
          volumePct: this.distanceGainAmount,
          occlusionPct: this.occlusionPct,
        });
      }
      // console.log(steamid, {
      //   isTalking,
      //   volumePct: this.distanceGainAmount,
      //   occlusionPct: this.occlusionPct,
      // });
      return map;
    });
  }

  public disconnect(): void {
    this.playerVoice3D.disconnect();
    this.playerVoice2D.disconnect();
    this.playerObject?.parent?.remove(this.playerObject);

    // Disconnect volume tracking
    this.processor?.removeEventListener('audioprocess', this.processMediaStream);
    this.processor?.disconnect();
    this.src?.disconnect();
    this.ctx?.close(); // close AudioContext
    this.dummyGain?.disconnect();
  }

  public setRefDistance(distance: number): void {
    if (distance === undefined) {
      return;
    }
    if (this.playerVoice3D.getRefDistance() !== distance) {
      console.log(`setting refDistance to ${distance}`);
      this.playerVoice3D.setRefDistance(distance);
    }
  }

  public setRolloffFactor(factor: number): void {
    if (factor === undefined) {
      return;
    }
    if (this.playerVoice3D.getRolloffFactor() !== factor) {
      this.playerVoice3D.setRolloffFactor(factor);
      console.log(`setting rolloffFactor to ${factor}`);
    }
  }

  private async initStereoFilters(): Promise<void> {
    const filter = this.listener_.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0;

    this.lowPassFilter_ = filter;

    const highpass = this.listener_.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.Q.value = 0;
    highpass.frequency.value = 100;

    this.highPassFilter_ = highpass;

    const gain = this.listener_.context.createGain();
    gain.gain.value = this.gainAmount;
    gain.gain.setValueAtTime(this.gainAmount, this.listener_.context.currentTime);
    this.gainFilter = gain;

    const distanceGain = this.listener_.context.createGain();
    distanceGain.gain.value = this.distanceGainAmount;
    distanceGain.gain.setValueAtTime(this.distanceGainAmount, this.listener_.context.currentTime);
    this.distanceGainFilter = distanceGain;
    this.distanceGainAmount = 1;

    // Setup reverb
    const impulseResponses: ImpulseResponseType[] = [
      'StAndrewsChurch',
      'ElvedenHallSmokingRoom',
      'PurnodesRailroadTunnel',
    ];

    await Promise.all(
      impulseResponses.map(async (name) => {
        const res = await fetch(`reverb/${name}.m4a`);
        const buffer = await res.arrayBuffer();
        const decoded = await this.listener_.context.decodeAudioData(buffer);
        this.impulseBuffers.set(name, decoded);
      }),
    );

    const reverb = this.listener_.context.createConvolver();
    this.reverbGainFilter = this.listener_.context.createGain();
    this.reverbGainFilter.gain.value = 0;
    this.reverbGainAmount = 0;
    // reverb.connect(this.reverbGainFilter);

    this.reverbFilter = reverb;

    this.playerVoice3D.setFilters([highpass, filter, gain, distanceGain]);
    const source = this.listener_.context.createMediaStreamSource(this.remoteStream);

    // TODO: reverb is not affected by lowpass once enabled
    // TODO: the result works for some scenarios...
    // TODO: ideally the "dry" voice should still be muffled
    // TODO: filters, inputs/outputs needs a rework overally

    source
      // .connect(filter)
      // .connect(gain)
      .connect(reverb)
      .connect(this.reverbGainFilter)
      .connect(this.playerVoice3D.context.destination);
  }

  private initMonoFilters(): void {
    // Positional audio is replaced by mono audio when spectating a player or hearing dead teammates
    const gain2 = this.listener_.context.createGain();
    gain2.gain.value = this.gainAmount;
    gain2.gain.setValueAtTime(this.gainAmount, this.listener_.context.currentTime);
    this.monoGainFilter = gain2;

    const highpassMono = this.listener_.context.createBiquadFilter();
    highpassMono.type = 'highpass';
    highpassMono.Q.value = 0;
    highpassMono.frequency.value = 750;
    this.monoHighpassFilter = highpassMono;
    this.playerVoice2D.setFilters([gain2, highpassMono]);
    this.playerVoice2D.setVolume(0);
  }

  public SwitchToMono(isAlive: boolean): void {
    if (!this.useMonoAudio) {
      this.useMonoAudio = true;
      const now = this.listener_.context.currentTime;
      this.gainFilter?.gain.linearRampToValueAtTime(0, now + 0.2); // smooth over 200ms
      if (isAlive) {
        // Reduce the volume of alive players while being spectated
        this.monoGainFilter?.gain.linearRampToValueAtTime(this.gainAmount / 1.5, now + 0.2);
      } else {
        this.monoGainFilter?.gain.linearRampToValueAtTime(this.gainAmount, now + 0.2);
      }
      console.log(`Switching ${this.steamId} to mono audio`);
      this.playerVoice2D.setVolume(0.3); // TODO: user setting: "Volume of dead teammates"
    }
  }

  public SwitchToStereo(): void {
    if (this.useMonoAudio) {
      this.useMonoAudio = false;
      const now = this.listener_.context.currentTime;
      this.gainFilter?.gain.linearRampToValueAtTime(this.gainAmount, now + 0.2); // smooth over 200ms
      this.monoGainFilter?.gain.linearRampToValueAtTime(0, now + 0.2);
      console.log(`Switching ${this.steamId} to stereo audio`);
      this.playerVoice2D.setVolume(0);
      this.monoHighpassFilter!.frequency.value = 100;
    }
  }

  /**
   * Mutes the positional sound source.
   *
   * @param delay How long in ms before setting the mute is applied (Default: 0ms)
   */
  public Mute(delay: number = 0): void {
    if (!this.isMuted) {
      clearInterval(this.unmuteTimeout);
      clearTimeout(this.muteTimeout);

      this.isMuted = true;

      this.muteTimeout = setTimeout(() => {
        this.playerVoice3D?.setVolume(0);
      }, delay);
    }
  }

  public Unmute(): void {
    if (this.isMuted || this.playerVoice3D?.getVolume() == 0) {
      clearInterval(this.unmuteTimeout);
      clearTimeout(this.muteTimeout);
      this.isMuted = false;
      // volume will be reset via distance checks
    }
  }

  public SetGain(amount: number): void {
    if (this.gainAmount !== amount) {
      this.gainAmount = amount;
      const now = this.listener_.context.currentTime;
      this.gainFilter?.gain.linearRampToValueAtTime(this.gainAmount, now + 0.2);
      this.monoGainFilter?.gain.linearRampToValueAtTime(this.gainAmount, now + 0.2);
    }
  }

  private setFilterFrequency(filter: BiquadFilterNode | undefined, amount: number): void {
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
    // lowPassFilter_.frequency.setValueAtTime(lowPassFilter_.frequency.value, now);
    filter.frequency.linearRampToValueAtTime(amount, now + 0.05); // smooth over 200ms
  }

  public setLowPassFilterFrequency(amount: number): void {
    this.setFilterFrequency(this.lowPassFilter_, amount);
  }

  public setHighPassFilterFrequency(amount: number): void {
    this.setFilterFrequency(this.highPassFilter_, amount);
  }

  public setMonoHighPassFilterFrequency(amount: number): void {
    const now = this.listener_.context.currentTime;
    this.monoHighpassFilter!.frequency.cancelScheduledValues(now);
    this.monoHighpassFilter!.frequency.linearRampToValueAtTime(amount, now + 0.05);
  }

  public updateFilters(
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>[],
    occlusionQuality: OcclusionQuality,
    occlusionConfig?: ServerConfigData,
    reverbZones?: ReverbZone[] | null,
  ): void {
    const distance = calculateDistance(this.clientCamera?.position, this.playerObject?.position);

    if (!distance) {
      return;
    }

    // Calculate reverb
    if (reverbZones) {
      this.updateReverb(reverbZones);
    }

    const { occlusion } = this.calculateOcclusion(
      occlusionMesh,
      this.clientCamera?.position,
      this.playerObject?.position,
      occlusionQuality,
    );

    this.updateOcclusion(distance, occlusion, occlusionConfig);
    this.updateDistanceVolume(distance, occlusion, occlusionConfig);
  }

  private updateReverb(reverbZones: ReverbZone[]): void {
    if (!this.clientCamera || !this.playerObject || !this.reverbFilter) {
      return;
    }

    let gain: number = 0;
    let zoneLabel: string = '';
    let zoneType: ImpulseResponseType = 'StAndrewsChurch';
    let fadeTime: number = 0.05;

    // We can divide an area into multiple zones as long as the labels match
    for (const zone of reverbZones) {
      if (!zone.mesh) {
        continue;
      }
      const zoneBox = new THREE.Box3().setFromObject(zone.mesh);

      if (zoneBox.containsPoint(this.playerObject?.position)) {
        zoneLabel = zone.label;
        break;
      }
    }

    const zonesPlayerIsIn: ReverbZone[] = reverbZones.filter((z) => z.label === zoneLabel);

    for (const zone of zonesPlayerIsIn) {
      if (!zone.mesh) {
        continue;
      }

      const zoneBox = new THREE.Box3().setFromObject(zone.mesh);

      const dist = zoneBox.distanceToPoint(this.clientCamera.position);
      const fadeStart = zone.fadeDistance;
      fadeTime = zone.fadeTime;
      zoneType = zone.type;
      if (zoneBox.containsPoint(this.clientCamera.position)) {
        gain = zone.strength;
        break;
      } else if (dist <= fadeStart) {
        gain = zone.strength * (1 - dist / fadeStart); // interpolate gain
      }
    }

    if (this.reverbGainAmount !== gain) {
      const irBuffer = this.impulseBuffers.get(zoneType);
      if (irBuffer && this.reverbFilter.buffer !== irBuffer) {
        this.reverbFilter.buffer = irBuffer;
        console.log(`Switched IR to ${zoneType}`);
      }
      this.reverbGainAmount = gain;
      const now = this.listener_.context.currentTime;
      this.reverbGainFilter!.gain.cancelScheduledValues(now);
      this.reverbGainFilter!.gain.setValueAtTime(this.reverbGainFilter!.gain.value, now);
      this.reverbGainFilter!.gain.linearRampToValueAtTime(gain, now + fadeTime);
    }
  }

  private updateDistanceVolume(
    distance: number,
    occlusion: number,
    occlusionConfig?: ServerConfigData,
  ): void {
    const volumeDropoffFactor =
      occlusionConfig?.volumeFalloffFactor ?? DEFAULT_SERVER_CONFIG.volumeFalloffFactor;
    const volumeMaxDistance =
      occlusionConfig?.volumeMaxDistance ?? DEFAULT_SERVER_CONFIG.volumeMaxDistance;
    const alwaysAudibleIfVisible =
      occlusionConfig?.alwaysHearVisiblePlayers ?? DEFAULT_SERVER_CONFIG.alwaysHearVisiblePlayers;

    const t = Math.min(distance / volumeMaxDistance, 1);
    const gain = 1 - Math.pow(t, volumeDropoffFactor);

    const roundedGain = Math.max(
      Math.round(gain * 1000) / 1000,
      occlusion <= 1 && alwaysAudibleIfVisible ? 0.05 : 0.0001,
    );

    // const roundedGain = Math.max(Math.round(gain * 1000) / 1000, 0.0001);

    if (this.distanceGainAmount !== roundedGain) {
      this.distanceGainAmount = roundedGain;
      // console.log(`GAIN: ${roundedGain} ${distance}`);

      if (!this.isMuted) {
        const now = this.listener_.context.currentTime;
        this.distanceGainFilter?.gain.cancelScheduledValues(now);
        this.distanceGainFilter?.gain.linearRampToValueAtTime(this.distanceGainAmount, now + 0.01);

        this.playerVoice3D.setVolume(this.distanceGainAmount);
      }
    }
  }

  public updateOcclusion(
    distance: number,
    occlusion: number,
    occlusionConfig?: ServerConfigData,
  ): void {
    // TODO: requires a lot of optimisation; mostly based on the number of meshes it has to cycle through per map

    if (distance === null) {
      return;
    }
    // TODO: increase occlusion for each mesh hit

    // "highest" occlusion <=> lower value <=> minimum
    // "lowest" occlusion <=> higher value <=> maximum

    const cfg = DEFAULT_SERVER_CONFIG;

    const occlusionWhenClose = occlusionConfig?.occlusionNear ?? cfg.occlusionNear; // Maximum occlusion when player is closest to sound source. The lower the number, the more muffled the player will be at right next to you while behind a wall.
    const occlusionWhenFar = occlusionConfig?.occlusionFar ?? cfg.occlusionFar; // The maximum occlusion when player's distance reaches fadeEnd
    const fadeEnd = occlusionConfig?.occlusionEndDist ?? cfg.occlusionEndDist; // Distance from player where it fully reaches occlusionWhenFar
    const occlusionFalloffFactor =
      occlusionConfig?.occlusionFalloffFactor ?? cfg.occlusionFalloffFactor; // Controls how quickly occlusion drops off with distance (higher = steeper drop near end, lower = more gradual fade)

    let finalOcclusion: number;
    if (occlusion === 0) {
      finalOcclusion = 11000;
    } else {
      const t = Math.min(distance / fadeEnd, 1);

      /*
        const occlusionFalloffFactor = 3;
        https://www.desmos.com/calculator
        Plug in `y=x^{exponent}` and zoom inbetween 0-1 on the X axis. The curve represents the sound occlusion falloff. (1 = furthest away)

        Example:
        Exponent: 1 = linear drop off
        Exponent: 4 = slow drop off to begin, then rapidly drops off at the end
        Exponent: 0.2 = rapidly drops off at the start, then very slowly drops off at the end
      */

      const eased = Math.pow(t, occlusionFalloffFactor); // exponent < 1 makes it drop off slower at first
      const baseOcclusion = occlusionWhenClose + (occlusionWhenFar - occlusionWhenClose) * eased;

      // Mix between 11000 (no occlusion) and baseOcclusion based on occlusion %
      finalOcclusion = 11000 + (baseOcclusion - 11000) * occlusion;
    }

    const roundedOcclusion = Math.round(finalOcclusion / 5) * 5;

    this.occlusionPct = roundedOcclusion / 11000;
    // console.log(`occlusion: ${roundedOcclusion}`);

    this.setLowPassFilterFrequency(roundedOcclusion);

    if (!distance) {
      return;
    }

    const targetHighpass = 100;
    this.setHighPassFilterFrequency(targetHighpass);
  }

  private calculateOcclusion = (
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>[],
    Listener_?: THREE.Vector3,
    playerVoice3D?: THREE.Vector3,
    occlusionQuality: OcclusionQuality = OcclusionQuality.MEDIUM,
  ): OcclusionData => {
    if (!Listener_ || !playerVoice3D) {
      return {
        occlusion: 0,
        totalExtraHits: 0,
      };
    }

    // Ensure our widening isnt bigger than our playermodel (64; 32 from middle), otherwise itll pass through walls
    const SndOcclusonWidening = 31;

    const SoundLeft = this.calculatePoint(playerVoice3D, Listener_, SndOcclusonWidening, true);
    const SoundRight = this.calculatePoint(playerVoice3D, Listener_, SndOcclusonWidening, false);

    const ListenerLeft = this.calculatePoint(Listener_, playerVoice3D, SndOcclusonWidening, true);
    const ListenerRight = this.calculatePoint(Listener_, playerVoice3D, SndOcclusonWidening, false);

    const lines: number[] = [];

    if (occlusionQuality >= OcclusionQuality.LOW) {
      lines.push(this.didIntersect(occlusionMesh, playerVoice3D, Listener_));
    }

    if (occlusionQuality >= OcclusionQuality.MEDIUM) {
      lines.push(this.didIntersect(occlusionMesh, SoundLeft, ListenerLeft));
      lines.push(this.didIntersect(occlusionMesh, SoundLeft, Listener_));
      lines.push(this.didIntersect(occlusionMesh, SoundRight, Listener_));
      lines.push(this.didIntersect(occlusionMesh, SoundRight, ListenerRight));
    }

    // Not reccommended on maps with high mesh/face count, unless occlusionUpdateRate has a larger value (less frequent updates)
    if (occlusionQuality >= OcclusionQuality.HIGH) {
      lines.push(this.didIntersect(occlusionMesh, SoundLeft, ListenerRight));
      lines.push(this.didIntersect(occlusionMesh, playerVoice3D, ListenerLeft));
      lines.push(this.didIntersect(occlusionMesh, playerVoice3D, ListenerRight));
      lines.push(this.didIntersect(occlusionMesh, SoundRight, ListenerLeft));
    }

    let hits = 0;
    for (const line of lines) {
      if (line >= 1) {
        hits += 1;
      }
    }
    if (hits > 0) {
      // console.log(`${hits} / 11 got hit. these equals to ${hits / 11}. setting filter to ${11000 - (hits / 11) * 11000}`);
    }

    let occlusionRatio = hits / lines.length;
    let totalExtraHits = 0;

    if (occlusionRatio === 1) {
      // Check how many extra hits occurred (i.e. walls behind walls)
      for (const line of lines) {
        if (line > 1) {
          totalExtraHits += line - 1;
        }
      }
      const extraDampening = THREE.MathUtils.clamp(totalExtraHits / lines.length, 0, 1);
      // Blend between normal full occlusion and extreme occlusion
      // 1 => 100% occluded, 2 => extra occluded (more walls)
      occlusionRatio += extraDampening; // could also weight this if needed
    }

    return { occlusion: hits / lines.length, totalExtraHits: totalExtraHits };

    // return hits / 11;
  };
  private raycaster = new THREE.Raycaster();

  private didIntersect = (
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>[],
    v1: THREE.Vector3,
    v2: THREE.Vector3,
  ): number => {
    if (occlusionMesh == null) {
      return 0;
    }

    const dir = v2.clone().sub(v1).normalize();
    this.raycaster.set(v1, dir);
    this.raycaster.firstHitOnly = true;

    const hits: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[] = [];
    for (const mesh of occlusionMesh) {
      if (!mesh.visible) {
        // Skip destroyed doors
        continue;
      }
      // hits = hits +  this.raycaster.intersectObject(mesh, true);
      const hit = this.raycaster.intersectObject(mesh, true);
      hits.push(...hit);
    }
    // const hits = this.raycaster.intersectObject(occlusionMesh, true);
    const maxDistance = v1.distanceTo(v2);
    const filteredHits = hits.filter((hit) => hit.distance <= maxDistance);
    // return hits.length;
    // const hits = this.raycaster.intersectObject(occlusionMesh, true);

    // console.log(`Ray hit ${filteredHits.length} objects`);

    // filteredHits.forEach((hit) => {
    //   // console.log(`Hit ${i}: Distance = ${hit.distance.toFixed(2)}, Object = ${hit.object.name}`);

    //   // Calculate the size of the mesh
    //   // TODO: we can use this in the future if our walls have thickness, and we can scale our occlusion with the 3d volume of the wall
    //   if (hit.object instanceof THREE.Mesh) {
    //     const object = hit.object as THREE.Mesh;
    //     object.geometry.computeBoundingBox();
    //     const box = object.geometry.boundingBox;
    //     const size = new THREE.Vector3();
    //     if (box) {
    //       box.getSize(size);
    //       // console.log("Mesh size:", size);
    //     }
    //   }
    // });

    return filteredHits.length;
  };

  private calculatePoint = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    m: number,
    posOrneg: boolean,
  ): THREE.Vector3 => {
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
  };
}

const calculateDistance = (a?: THREE.Vector3, b?: THREE.Vector3): number | null => {
  if (a && b) {
    return a.distanceTo(b);
  }
  return null;
};
