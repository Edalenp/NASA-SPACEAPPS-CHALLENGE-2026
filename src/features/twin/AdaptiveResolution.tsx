import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useHabitatMotion, useReducedMotion } from './environments/motion';

/**
 * Keeps the body fluid on slow GPUs: when the frames the motion asks for (one every 33 ms) come
 * slower than 22 a second, the render resolution steps down, to no less than `min`. A level that
 * lagged once becomes the ceiling, so the scene never climbs back into the stutter it just left;
 * it steps up again only after three calm windows in a row, and only below that ceiling.
 * Measured only while the motion plays, because a still scene renders on demand.
 */
export default function AdaptiveResolution({ min = 0.7, max }: { min?: number; max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const playing = useHabitatMotion((s) => s.playing);
  const reduced = useReducedMotion();
  const active = playing && !reduced;
  const sample = useRef({ time: 0, frames: 0, dpr: max, ceiling: max, calm: 0 });
  useFrame((_, delta) => {
    const s = sample.current;
    // A long gap means the scene was idle or the tab hidden, not slow: start over.
    if (!active || delta > 0.5) {
      s.time = 0;
      s.frames = 0;
      return;
    }
    s.time += delta;
    s.frames += 1;
    if (s.time < 2) return;
    const fps = s.frames / s.time;
    s.time = 0;
    s.frames = 0;
    let next = s.dpr;
    if (fps < 22) {
      s.ceiling = Math.max(min, s.dpr - 0.1);
      s.calm = 0;
      next = Math.max(min, s.dpr - 0.15);
    } else if (fps > 28.5) {
      s.calm += 1;
      if (s.calm >= 3) {
        s.calm = 0;
        next = Math.min(s.ceiling, s.dpr + 0.05);
      }
    } else {
      s.calm = 0;
    }
    if (Math.abs(next - s.dpr) > 0.01) {
      s.dpr = next;
      setDpr(next);
    }
  });
  return null;
}
