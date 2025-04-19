export interface MouseInputState {
  leftButton: boolean;
  rightButton: boolean;
  mouseXDelta: number;
  mouseYDelta: number;
  mouseX: number;
  mouseY: number;
}

export class InputController {
  private target_: any;
  public current_: MouseInputState;
  public previous_: MouseInputState | null;
  private keys_: Record<number, boolean>;
  private previousKeys_: Record<number, boolean>;

  constructor(target?: any) {
    this.target_ = target || document;
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};

    this.initialize_();
  }

  initialize_() {
    this.target_.addEventListener('mousedown', (e: any) => this.onMouseDown_(e), false);
    this.target_.addEventListener('mousemove', (e: any) => this.onMouseMove_(e), false);
    this.target_.addEventListener('mouseup', (e: any) => this.onMouseUp_(e), false);
    this.target_.addEventListener('keydown', (e: any) => this.onKeyDown_(e), false);
    this.target_.addEventListener('keyup', (e: any) => this.onKeyUp_(e), false);
  }

  onMouseMove_(e: any) {
    this.current_.mouseX = e.pageX - window.innerWidth / 2;
    this.current_.mouseY = e.pageY - window.innerHeight / 2;

    if (this.previous_ === null) {
      this.previous_ = { ...this.current_ };
    }

    this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
    this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
  }

  onMouseDown_(e: any) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e: any) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e: any) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e: any) {
    this.keys_[e.keyCode] = false;
  }

  key(keyCode: any) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_: any) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = { ...this.current_ };
    }
  }
}
