import { useEffect, useRef, useState } from 'react';

/** A figure that counts to its new value instead of jumping; its width is reserved by the CSS. */
export function Count({ value, reduced }: { value: number; reduced: boolean }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) { from.current = value; return; }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(origin + (value - origin) * eased);
      setShown(current);
      from.current = current;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <>{reduced ? value : shown}</>;
}
