import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(SplitText, ScrollTrigger);

interface TypingOptions {
  delay?: number;
  /** Seconds per letter. */
  speed: number;
  reduced: boolean;
  /** Start when the block scrolls into view instead of on load. */
  onView?: boolean;
  /** Hold the letters hidden and wait (the page is still loading); typing starts when it clears. */
  wait?: boolean;
}

/**
 * Types a block of text out letter by letter, a caret riding the last letter written. The text
 * is in the page from the start (letters hidden), so the layout never shifts and screen readers
 * read it whole.
 */
export function useTyping(target: RefObject<HTMLElement | null>, { delay = 0, speed, reduced, onView = false, wait = false }: TypingOptions) {
  useLayoutEffect(() => {
    const element = target.current;
    if (!element || reduced || wait) return;
    const split = new SplitText(element, { type: 'chars,words' });
    const caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.setAttribute('aria-hidden', 'true');
    element.appendChild(caret);
    gsap.set(split.chars, { opacity: 0 });
    // Measured against the block itself: SplitText wraps letters in words, so offsets would be per word.
    const place = (char: HTMLElement, after: boolean) => {
      const box = element.getBoundingClientRect();
      const at = char.getBoundingClientRect();
      caret.style.transform = `translate(${at.left - box.left + (after ? at.width : 0)}px, ${at.top - box.top}px)`;
      caret.style.height = `${at.height}px`;
    };
    const chars = split.chars as HTMLElement[];
    place(chars[0], false);
    const timeline = gsap.timeline({ delay, paused: onView });
    chars.forEach((char, index) => {
      timeline.set(char, { opacity: 1 }, index * speed).call(place, [char, true], index * speed);
    });
    // The caret rests a moment on the last letter, then leaves.
    timeline.call(() => caret.remove(), [], '+=1.2');
    const trigger = onView ? ScrollTrigger.create({ trigger: element, start: 'top 82%', once: true, onEnter: () => timeline.play() }) : null;
    return () => { trigger?.kill(); timeline.kill(); caret.remove(); split.revert(); };
  }, [target, delay, speed, reduced, onView, wait]);
}

/** Whether the reader asked for less motion; follows the setting live. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return reduced;
}
