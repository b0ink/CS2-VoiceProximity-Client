import * as THREE from 'three';

export class SoundSourceData {
  private lowPassFilter_?: BiquadFilterNode;
  private lowPassAmount?: number;

  private highPassFilter_?: BiquadFilterNode;
  private highPassAmount?: number;

  private gainFilter?: GainNode;
  private gainAmount?: number;

  public sound_?: THREE.PositionalAudio;
  private listener_?: THREE.AudioListener;
  public steamId?: string;
  public soundObjSource_?: THREE.Object3D;
  public camera_?: THREE.Camera;

  private isMuted: boolean = false;

  // private occlusionMesh?: THREE.Group<THREE.Object3DEventMap>;

  constructor(
    // occlusionMesh: THREE.Group<THREE.Object3DEventMap> | undefined,
    sound: THREE.PositionalAudio,
    soundObjSource: THREE.Object3D,
    listener: THREE.AudioListener,
    camera: THREE.Camera,
  ) {
    this.sound_ = sound;
    this.listener_ = listener;
    this.soundObjSource_ = soundObjSource;
    this.camera_ = camera;
    // this.occlusionMesh = occlusionMesh;
    // steamId = null; // ? maybe?
    // intialise_();

    const filter = this.listener_.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0;
    // filter.frequency.setValueAtTime(25000, listener_.context.currentTime);
    // filter.gain.setValueAtTime(25, listener_.context.currentTime);

    this.lowPassFilter_ = filter;
    // sound_.setFilter(filter);

    const highpass = this.listener_.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.Q.value = 0;
    highpass.frequency.value = 100;
    // highpass.frequency.setValueAtTime(100, listener_.context.currentTime);
    // highpass.gain.setValueAtTime(25, listener_.context.currentTime);

    this.highPassFilter_ = highpass;

    const gain = this.listener_.context.createGain();
    gain.gain.value = 1;
    gain.gain.setValueAtTime(1, this.listener_.context.currentTime);
    // filter.frequency.linearRampToValueAtTime(amount, now + 0.05); // smooth over 200ms

    // highpass.gain.setValueAtTime(25, listener_.context.currentTime);

    this.gainFilter = gain;

    this.sound_.setFilters([gain, highpass, filter]);
  }

  /**
   * Mutes the positional sound source.
   *
   * @param delay How long in ms before setting the mute is applied (Default: 0ms)
   */
  public Mute(delay: number = 0) {
    if (!this.isMuted) {
      this.isMuted = true;
      setTimeout(() => {
        this.sound_?.setVolume(0);
      }, delay);
    }
  }

  public Unmute() {
    if (this.isMuted || this.sound_?.getVolume() == 0) {
      this.isMuted = false;
      // sound_?.setVolume(0.85); // TODO: use constant for volume (or even the preference of the listener)

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
    // lowPassFilter_.frequency.setValueAtTime(lowPassFilter_.frequency.value, now);
    filter.frequency.linearRampToValueAtTime(amount, now + 0.05); // smooth over 200ms
  }

  public setLowPassFilterFrequency(amount: number) {
    this.setFilterFrequency(this.lowPassFilter_, amount);
  }

  public setHighPassFilterFrequency(amount: number) {
    this.setFilterFrequency(this.highPassFilter_, amount);
  }

  public updateOcclusion(occlusionMesh: THREE.Group<THREE.Object3DEventMap>) {
    const distance = calculateDistance(this.camera_?.position, this.soundObjSource_?.position);

    // TODO: increase occlusion for each mesh hit
    const { occlusion } = this.calculateOcclusion(
      occlusionMesh,
      this.camera_?.position,
      this.soundObjSource_?.position,
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

    // const distance = calculateDistance(soundData.camera_.position, soundData.soundObjSource_.position);
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

  calculateOcclusion = (
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>,
    Listener_?: THREE.Vector3,
    Sound_?: THREE.Vector3,
  ) => {
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

    const ListenerAbove = new THREE.Vector3(
      Listener_.x,
      Listener_.y,
      Listener_.z + SndOcclusonWidening * 0.5,
    );
    const ListenerBelow = new THREE.Vector3(
      Listener_.x,
      Listener_.y,
      Listener_.z - SndOcclusonWidening * 0.5,
    );

    const line1 = this.didIntersect(occlusionMesh, SoundLeft, Listener_);
    const line2 = this.didIntersect(occlusionMesh, SoundLeft, Listener_);
    const line3 = this.didIntersect(occlusionMesh, SoundLeft, ListenerRight);
    const line4 = this.didIntersect(occlusionMesh, Sound_, ListenerLeft);
    const line5 = this.didIntersect(occlusionMesh, Sound_, Listener_);
    const line6 = this.didIntersect(occlusionMesh, Sound_, ListenerRight);
    const line7 = this.didIntersect(occlusionMesh, SoundRight, ListenerLeft);
    const line8 = this.didIntersect(occlusionMesh, SoundRight, Listener_);
    const line9 = this.didIntersect(occlusionMesh, SoundRight, ListenerRight);
    const line10 = this.didIntersect(occlusionMesh, SoundAbove, ListenerAbove);
    const line11 = this.didIntersect(occlusionMesh, SoundBelow, ListenerBelow);
    const lines = [line1, line2, line3, line4, line5, line6, line7, line8, line9, line10, line11];
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

    return { occlusion: hits / 11, totalExtraHits: totalExtraHits };

    // return hits / 11;
  };

  didIntersect = (
    occlusionMesh: THREE.Group<THREE.Object3DEventMap>,
    v1: THREE.Vector3,
    v2: THREE.Vector3,
  ) => {
    const raycaster = new THREE.Raycaster();
    const dir = v2.clone().sub(v1).normalize();
    raycaster.set(v1, dir);

    if (occlusionMesh == null) {
      return 0;
    }

    const hits = raycaster.intersectObject(occlusionMesh, true);

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
  };

  calculatePoint = (a: THREE.Vector3, b: THREE.Vector3, m: number, posOrneg: boolean) => {
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

const calculateDistance = (a?: THREE.Vector3, b?: THREE.Vector3) => {
  if (a && b) {
    return a.distanceTo(b);
  }
  return null;
};
