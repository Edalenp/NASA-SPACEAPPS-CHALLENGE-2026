import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stripBlobs } from './meshRepair';

const indexed = (geometry: THREE.BufferGeometry) => (geometry.index ? geometry : (() => {
  geometry.setIndex(Array.from({ length: geometry.getAttribute('position').count }, (_, i) => i));
  return geometry;
})());

describe('vessel mesh repair', () => {
  it('drops an organ-shaped blob and keeps long vessels', () => {
    const vessel = indexed(new THREE.CylinderGeometry(0.02, 0.02, 1, 12, 40));
    const blob = indexed(new THREE.SphereGeometry(0.3, 24, 16));
    blob.translate(0.5, 0, 0);
    const merged = mergeGeometries([vessel, blob])!;
    const before = merged.index!.count / 3;
    const removed = stripBlobs(merged);
    expect(removed).toBe(blob.index!.count / 3);
    expect(merged.index!.count / 3).toBe(before - removed);
  });
  it('leaves a mesh of vessels alone', () => {
    const vessel = indexed(new THREE.CylinderGeometry(0.02, 0.02, 1, 12, 40));
    expect(stripBlobs(vessel)).toBe(0);
  });
});
