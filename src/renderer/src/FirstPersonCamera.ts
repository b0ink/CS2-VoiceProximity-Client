import * as THREE from 'three';

export class FirstPersonCamera {
  public camera_: THREE.PerspectiveCamera;

  public position_: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public lookAt_: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera_ = camera;
  }

  update() {
    this.camera_.position.copy(this.position_);
    this.camera_.lookAt(this.lookAt_);
  }

  // TODO: will tweening the camera to the next position smooth out the audio glitches?
  // new TWEEN.Tween(camera_.position)
  //   .to(position, 1)
  //   .easing(TWEEN.Easing.Cubic)
  //   .start();
}
