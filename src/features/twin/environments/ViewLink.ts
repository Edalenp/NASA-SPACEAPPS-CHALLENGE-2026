import { PerspectiveCamera } from 'three';

/** Imperative camera transport between independent WebGL roots. */
export class ViewLink {
  readonly view = new PerspectiveCamera(32, 1, 0.1, 500);
  private request: () => void = () => {};

  constructor() {
    this.view.position.set(0.7, 1.2, 3.7);
    this.view.lookAt(0, 0.86, 0);
  }

  connect(request: () => void) { this.request = request; }
  redraw() { this.request(); }
}
