import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { flowCoordinates, vesselArrays } from './bloodFlow';

/** A straight tube from x = 0 to x = 1, the heart sitting just before its start. */
function tube(segments = 200) {
  const path = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, segments, 0.01, 8, false));
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('flowCoordinates', () => {
  it('measures distance along the vessel from the end nearest the heart', () => {
    const mesh = tube();
    const { position, coord } = flowCoordinates(vesselArrays(mesh), mesh.matrixWorld, new THREE.Vector3(-0.1, 0, 0), 1);
    let near = Infinity, far = -Infinity;
    for (let i = 0; i < coord.length; i++) {
      if (position[i * 3] < 0.001) near = Math.min(near, coord[i]);
      if (position[i * 3] > 0.999) far = Math.max(far, coord[i]);
    }
    expect(near).toBeGreaterThan(0.09);
    expect(near).toBeLessThan(0.13);
    expect(far).toBeGreaterThan(1.05);
    expect(far).toBeLessThan(1.2);
    coord.forEach((value) => expect(Number.isFinite(value)).toBe(true));
  });

  it('stays fast on a vessel-sized mesh', () => {
    const mesh = tube(2000);
    const start = performance.now();
    flowCoordinates(vesselArrays(mesh), mesh.matrixWorld, new THREE.Vector3(-0.1, 0, 0), 1);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
