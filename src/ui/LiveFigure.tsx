import { useEffect, useState } from "react";
import { useReducedMotion } from "../features/twin/environments/motion";

/**
 * A figure that loads in: when it first shows and whenever it changes, its digits roll through
 * random values and settle left to right in about half a second. It reserves its width (tabular
 * digits, one `ch` per character), so nothing around it jumps. Reduced motion shows it at once.
 */
export function LiveFigure({ value }: { value: string }) {
  const reduced = useReducedMotion();
  const [rolling, setRolling] = useState<string | null>(null);
  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const duration = 520;
    let frame = 0;
    const tick = () => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) { setRolling(null); return; }
      const settled = Math.floor(t * value.length);
      setRolling(value.replace(/\d/g, (digit, i: number) => (i < settled ? digit : String(Math.floor(Math.random() * 10)))));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return (
    <span className="live-figure" style={{ minWidth: `${value.length}ch` }}>
      {rolling ?? value}
    </span>
  );
}
