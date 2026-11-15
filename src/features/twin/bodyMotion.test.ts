import { describe, expect, it } from 'vitest';
import { heartbeat, jellyUniforms, updateBodyMotion } from './selectionMaterials';

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
