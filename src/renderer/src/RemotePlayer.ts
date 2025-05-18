import * as THREE from 'three';
import type { Client } from './type';
import { transformVector } from './lib/vector';

import {
  computeBoundsTree,
  disposeBoundsTree,
  computeBatchedBoundsTree,
  disposeBatchedBoundsTree,
  acceleratedRaycast,
} from 'three-mesh-bvh';

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

  private monoGainFilter?: GainNode;
  private monoHighpassFilter?: BiquadFilterNode;

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

    // Debug positions to set the speaker if it's not attached to any real player positions
    playerObject.position.copy(transformVector(new THREE.Vector3(457.5018, 1833.5608, 136.03122))); // banana half wall CT side
    // playerObject.position.set(27.168392, -189.78938 + 64, 664.5947); // mirage top mid
    // playerObject.position.set(319.3484, -39.96875 + 64, 2278.2021); // mirage palace

    // Needed to make threejs positional audio work with remoteStream
    const audioRef = new Audio();
    audioRef.srcObject = remoteStream;
    audioRef.muted = true;

    const playerVoice3D = new THREE.PositionalAudio(listener);
    playerVoice3D.setMediaStreamSource(remoteStream);
    playerVoice3D.setVolume(1);
    playerVoice3D.setRefDistance(39);
    playerVoice3D.setRolloffFactor(1);
    playerVoice3D.setMaxDistance(1000);
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

    this.gainAmount = 2; // TODO: to be adjusted by the player
    this.initStereoFilters();
    this.initMonoFilters();
  }

  private initStereoFilters(): void {
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

    this.playerVoice3D.setFilters([gain, highpass, filter]);
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

  public SwitchToMono(): void {
    if (!this.useMonoAudio) {
      this.useMonoAudio = true;
      const now = this.listener_.context.currentTime;
      this.gainFilter?.gain.linearRampToValueAtTime(0, now + 0.2); // smooth over 200ms
      this.monoGainFilter?.gain.linearRampToValueAtTime(this.gainAmount, now + 0.2);
      console.log(`Switching ${this.steamId} to mono audio`);
      this.playerVoice2D.setVolume(0.3);
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
      // playerVoice3D?.setVolume(0.85); // TODO: use constant for volume (or even the preference of the listener)

      // fade the volume back up (attempt to prevent glitches)
      const targetVolume = 1;
      const fadeDuration = 1000;
      const step = (targetVolume - (this.playerVoice3D?.getVolume() || 0)) / (fadeDuration / 16);

      let currentVolume = this.playerVoice3D?.getVolume() || 0;
      this.unmuteTimeout = setInterval(() => {
        currentVolume += step;
        if (currentVolume >= targetVolume) {
          currentVolume = targetVolume;
          clearInterval(this.unmuteTimeout);
        }
        this.playerVoice3D?.setVolume(currentVolume);
      }, 16);
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

  public updateOcclusion(occlusionMesh: THREE.Group<THREE.Object3DEventMap>): void {
    // TODO: requires a lot of optimisation; mostly based on the number of meshes it has to cycle through per map

    const distance = calculateDistance(this.clientCamera?.position, this.playerObject?.position);
    //TODO: we could check if distance >= 2000 to avoid calculating occlusion, but we want to ensure performance everywhere
    if (distance === null) {
      return;
    }
    // TODO: increase occlusion for each mesh hit
    const { occlusion } = this.calculateOcclusion(
      occlusionMesh,
      this.clientCamera?.position,
      this.playerObject?.position,
    );
    const maxDist = 1000;
    const fadeStart = 1500;
    const fadeEnd = 2000; // where it fully reaches 25

    const distRatio = Math.min(distance / maxDist, 1);
    let minOcclusion;

    if (distance <= fadeStart) {
      minOcclusion = 100;
    } else {
      const fadeRatio = Math.min((distance - fadeStart) / (fadeEnd - fadeStart), 1);
      minOcclusion = 100 - fadeRatio * (100 - 25); // fades from 100 → 25
    }

    const minFreq = minOcclusion + (1 - distRatio) * (500 - minOcclusion);

    const easing = 0.5;
    const eased = Math.pow(occlusion, easing);

    const amount = Math.round((minFreq + (1 - eased) * (11000 - minFreq)) / 5) * 5;

    this.setLowPassFilterFrequency(amount);

    // const distance = calculateDistance(soundData.clientCamera.position, soundData.playerObject.position);
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

    if (!distance) {
      return;
    }

    // const maximumHighpass = 20000;
    const targetHighpass = 100;

    // if (distance > 1000) {
    //   const clamped = Math.min(Math.max(distance, 500), 3000);
    //   const t = (clamped - 500) / (3000 - 500);
    //   targetHighpass = 100 + t * (maximumHighpass - 100);
    // }

    // if (occlusion < 0.3) {
    //   targetHighpass /= 2;
    // }

    this.setHighPassFilterFrequency(targetHighpass);

    // const normalized = THREE.MathUtils.clamp(distance / maxDistance, 0, 1);
    // const easedDistance = Math.pow(normalized, 5);

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
    // console.log(`setting highpass to ${targetHighpass} (${distance} units away)`)
  }

  private calculateOcclusion = (
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>,
    Listener_?: THREE.Vector3,
    playerVoice3D?: THREE.Vector3,
  ): OcclusionData => {
    if (!Listener_ || !playerVoice3D) {
      return {
        occlusion: 0,
        totalExtraHits: 0,
      };
    }
    //! if our widening is less than the edges of our player model (32 units on each side); then the ray casts wont go through the walls
    // alternatively we add another layer of meshes inbetween large walls gaps (dust 2 B car to tunnels)
    // const SndOcclusonWidening = 31;

    // const Sound = new THREE.Vector3(23.8, -57.1, 0.66);
    // const Listener = new THREE.Vector3(8.18, -55.1, 0.66);
    // console.log(`listener: ${listener.x} ${listener.y} ${listener.z}`)
    // console.log(`sound: ${sound.x} ${sound.y} ${sound.z}`)

    // const playerVoice3D = new THREE.Vector3(sound.x, sound.z, sound.y * -1);
    // const Listener_ = new THREE.Vector3(listener.x, listener.z, listener.y * -1);

    // const SoundLeft = this.calculatePoint(playerVoice3D, Listener_, SndOcclusonWidening, true);
    // const SoundRight = this.calculatePoint(playerVoice3D, Listener_, SndOcclusonWidening, false);

    // const SoundAbove = new THREE.Vector3(
    //   playerVoice3D.x,
    //   playerVoice3D.y,
    //   playerVoice3D.z + SndOcclusonWidening,
    // );
    // const SoundBelow = new THREE.Vector3(
    //   playerVoice3D.x,
    //   playerVoice3D.y,
    //   playerVoice3D.z - SndOcclusonWidening,
    // );

    // const ListenerLeft = this.calculatePoint(Listener_, playerVoice3D, SndOcclusonWidening, true);
    // const ListenerRight = this.calculatePoint(Listener_, playerVoice3D, SndOcclusonWidening, false);

    // const ListenerAbove = new THREE.Vector3(
    //   Listener_.x,
    //   Listener_.y,
    //   Listener_.z + SndOcclusonWidening * 0.5,
    // );
    // const ListenerBelow = new THREE.Vector3(
    //   Listener_.x,
    //   Listener_.y,
    //   Listener_.z - SndOcclusonWidening * 0.5,
    // );

    // TODO: this tanks performance once we have 10+ players connected
    // const line1 = this.didIntersect(occlusionMesh, SoundLeft, Listener_);
    // const line2 = this.didIntersect(occlusionMesh, SoundLeft, Listener_);
    // const line3 = this.didIntersect(occlusionMesh, SoundLeft, ListenerRight);
    // const line4 = this.didIntersect(occlusionMesh, playerVoice3D, ListenerLeft);
    const line5 = this.didIntersect(occlusionMesh, playerVoice3D, Listener_);
    // const line6 = this.didIntersect(occlusionMesh, playerVoice3D, ListenerRight);
    // const line7 = this.didIntersect(occlusionMesh, SoundRight, ListenerLeft);
    // const line8 = this.didIntersect(occlusionMesh, SoundRight, Listener_);
    // const line9 = this.didIntersect(occlusionMesh, SoundRight, ListenerRight);
    // const line10 = this.didIntersect(occlusionMesh, SoundAbove, ListenerAbove);
    // const line11 = this.didIntersect(occlusionMesh, SoundBelow, ListenerBelow);
    // const lines = [line1, line2, line3, line4, line5, line6, line7, line8, line9, line10, line11];
    const lines = [line5];
    let hits = 0;
    for (const line of lines) {
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
      for (const line of lines) {
        if (line > 1) {
          totalExtraHits += line - 1;
        }
      }
      const extraDampening = THREE.MathUtils.clamp(totalExtraHits / 11, 0, 1);
      // Blend between normal full occlusion and extreme occlusion
      // 1 => 100% occluded, 2 => extra occluded (more walls)
      occlusionRatio += extraDampening; // could also weight this if needed
    }

    return { occlusion: hits / 1, totalExtraHits: totalExtraHits };

    // return hits / 11;
  };
  private raycaster = new THREE.Raycaster();

  private didIntersect = (
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>,
    v1: THREE.Vector3,
    v2: THREE.Vector3,
  ): number => {
    if (occlusionMesh == null) {
      return 0;
    }

    const dir = v2.clone().sub(v1).normalize();
    this.raycaster.set(v1, dir);
    this.raycaster.firstHitOnly = true;

    const hits = this.raycaster.intersectObject(occlusionMesh, true);
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
