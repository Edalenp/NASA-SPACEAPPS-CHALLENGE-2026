import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from '../twin/environments/motion';

/** Reveals reserved letters with one CSS variable; no React frame updates or illustration remounts. */
export function GuideText({ text }: { text: string }) {
  const node = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const words = text.split(/(\s+)/);
  const rate = Math.min(18, 1400 / Math.max(1, text.length));
  const offsets = words.reduce<number[]>((out, word) => [...out, (out.at(-1) ?? 0) + word.length], []);
  useEffect(() => {
    const target = node.current;
    if (!target) return;
    target.style.setProperty('--typed-count', reduced ? String(text.length) : '0');
    if (reduced) return;
    const start = performance.now();
    const timer = setInterval(() => {
      const count = Math.min(text.length, Math.max(0, Math.floor((performance.now() - start - 160) / rate)));
      target.style.setProperty('--typed-count', String(count));
      if (count === text.length) clearInterval(timer);
    }, 34);
    return () => clearInterval(timer);
  }, [text, rate, reduced]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={node} aria-hidden="true" className="guide-typed" key={text}>
        {words.map((word, index) => /^\s+$/.test(word) ? word : (
          <span className="guide-typed-word" key={index}>
            {Array.from(word).map((letter, character) => (
              <span className="guide-typed-letter" key={character}
                style={{ '--letter': (offsets[index - 1] ?? 0) + character } as CSSProperties}>
                {letter}
              </span>
            ))}
          </span>
        ))}
      </span>
    </>
  );
}
