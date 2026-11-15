import { useEffect, useRef, useState } from 'react';

/**
 * The figure counts towards its target instead of jumping, so the number and the bar move as one.
 * One loop for the plate's whole life, chasing the latest target: restarting it on every download
 * event left the figure crawling behind the bytes. Timed by the clock, not by frames: a frame
 * stamp can come before the loop's own (a negative step, once shown as "-1"), and a busy GPU
 * compiling shaders must not slow the count to a crawl.
 */
export function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const goal = useRef(target);
  useEffect(() => { goal.current = target; }, [target]);
  useEffect(() => {
    let frame = 0;
    let current = 0;
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      // Ease towards the target, at least 60 points a second so the end never drags.
      const gap = goal.current - current;
      if (gap > 0) current = Math.min(goal.current, current + Math.max(gap * 6 * dt, 60 * dt));
      const shown = Math.floor(current);
      setValue((previous) => (previous === shown ? previous : shown));
      if (current < 100) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  return value;
}
