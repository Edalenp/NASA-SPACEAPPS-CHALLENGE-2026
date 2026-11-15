import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { heartbeat, jellyUniforms, updateBodyMotion, updateHeadTurn } from './selectionMaterials';

/** Samples the beat as the twin does, at 30 frames a second, and returns the peak of each beat. */
function peaksAt(bpm: number, seconds = 2) {
  const uniforms = jellyUniforms();
  const peaks: number[] = [];
  let last = 0;
  for (let frame = 0; frame < seconds * 30; frame++) {
    updateBodyMotion(uniforms, 1 / 30, bpm, 14, true);
    const beat = Math.floor(((frame + 1) / 30) * (bpm / 60));
    if (beat !== last) { peaks.push(0); last = beat; }
    peaks[peaks.length - 1] = Math.max(peaks[peaks.length - 1] ?? 0, uniforms.beat.value);
  }
  return peaks.slice(1, -1);
}

describe('body motion', () => {
  it('smoothly follows an upward and downward gaze, and returns to the lab neutral pitch', () => {
    const uniforms = jellyUniforms();
    const axis = new Vector3(0, 1.65, 0);
    updateHeadTurn(uniforms, 1 / 60, 0.4, axis, 1.45, 1.58, -0.45);
    expect(uniforms.headTurn.value).toBeGreaterThan(0);
    expect(uniforms.headPitch.value).toBeLessThan(0);
    expect(uniforms.headPitch.value).toBeGreaterThan(-0.45);
    for (let i = 0; i < 120; i++) updateHeadTurn(uniforms, 1 / 60, -0.4, axis, 1.45, 1.58, 0.35);
    expect(uniforms.headTurn.value).toBeCloseTo(-0.4, 3);
    expect(uniforms.headPitch.value).toBeCloseTo(0.35, 3);
    for (let i = 0; i < 120; i++) updateHeadTurn(uniforms, 1 / 60, 0, axis, 1.45, 1.58);
    expect(uniforms.headTurn.value).toBe(0);
    expect(uniforms.headPitch.value).toBe(0);
  });

  it('shows every beat of a fast heart at 30 frames a second', () => {
    for (const peak of peaksAt(250)) expect(peak).toBeGreaterThan(0.5);
  });

  it('beats deeper and breathes deeper as the rates climb', () => {
    const calm = jellyUniforms();
    const agitated = jellyUniforms();
    updateBodyMotion(calm, 1 / 30, 70, 14, true);
    updateBodyMotion(agitated, 1 / 30, 160, 28, true);
    expect(agitated.beatGain.value).toBeGreaterThan(calm.beatGain.value);
    expect(agitated.breathGain.value).toBeGreaterThan(calm.breathGain.value);
  });

  it('holds still when motion is paused', () => {
    const uniforms = jellyUniforms();
    updateBodyMotion(uniforms, 1 / 30, 120, 20, false);
    expect(uniforms.beat.value).toBe(0);
    expect(uniforms.breath.value).toBe(0);
    expect(uniforms.flowOn.value).toBe(0);
  });

  it('peaks at the start of each beat', () => {
    expect(heartbeat(0, 0.8)).toBeCloseTo(1, 1);
    expect(heartbeat(0.6, 0.8)).toBeLessThan(0.05);
  });
});
