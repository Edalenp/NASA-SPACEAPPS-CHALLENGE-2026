import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useHabitatMotion, useReducedMotion } from './environments/motion';

/**
 * Keeps the body fluid on slow GPUs: when the frames the motion asks for (one every 33 ms) come
 * slower than 22 a second, the render resolution steps down, to no less than `min`; with room to
 * spare it steps back up to `max`. Measured only while the motion plays, because a still scene
 * renders on demand and its frame times say nothing about the GPU.
 */
export default function AdaptiveResolution({ min = 0.7, max }: { min?: number; max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const playing = useHabitatMotion((s) => s.playing);
  const reduced = useReducedMotion();
  const active = playing && !reduced;
  const sample = useRef({ time: 0, frames: 0, dpr: max });
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
    const next = fps < 22 ? Math.max(min, s.dpr - 0.15) : fps > 28.5 ? Math.min(max, s.dpr + 0.1) : s.dpr;
    if (Math.abs(next - s.dpr) > 0.01) {
      s.dpr = next;
      setDpr(next);
    }
  });
  return null;
}
