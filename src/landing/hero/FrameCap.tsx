import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Draws the canvas at a fixed rate instead of every display frame. The hero's liquid moves slowly
 * and the heart beats well at 30 frames a second (the lab's own rate), so halving the frames
 * halves the GPU work on 60 Hz screens and more on 120 Hz ones. Stops while the hero is away.
 */
export function FrameCap({ fps = 30, running }: { fps?: number; running: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!running) return;
    invalidate();
    const id = window.setInterval(invalidate, 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, running, invalidate]);
  return null;
}
