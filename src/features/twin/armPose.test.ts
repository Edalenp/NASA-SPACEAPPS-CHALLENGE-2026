import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { armWeight } from './armPose';

describe('arm membership for the relaxed pose', () => {
  it('moves the hands and forearms', () => {
    expect(armWeight(new Vector3(0.27, 0.8, 0.05))).toBe(1);
    expect(armWeight(new Vector3(-0.24, 1.0, 0))).toBe(1);
  });
  it('leaves the flank, thighs and neck alone', () => {
    expect(armWeight(new Vector3(0.14, 1.0, 0))).toBe(0);
    expect(armWeight(new Vector3(0.15, 0.8, 0.02))).toBe(0);
    expect(armWeight(new Vector3(0.05, 1.45, 0))).toBe(0);
  });
  it('blends across the shoulder instead of tearing it', () => {
    const w = armWeight(new Vector3(0.16, 1.3, 0));
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(1);
  });
});
