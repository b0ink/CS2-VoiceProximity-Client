import * as THREE from 'three';

function transformVector(input: THREE.Vector3) {
  return new THREE.Vector3(input.x, input.z, input.y * -1);
}

export class FirstPersonCamera {
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
    // new TWEEN.Tween(camera_.position)
    //   .to(position, 1)
    //   .easing(TWEEN.Easing.Cubic)
    //   .start();
  }

  updateAngles_() {
    const lookAt = transformVector(this.lookAt_);
    this.camera_.lookAt(lookAt);
  }
}
