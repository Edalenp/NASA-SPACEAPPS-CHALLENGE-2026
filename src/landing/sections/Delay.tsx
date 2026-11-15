import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useReducedMotion } from '../typing';
import { BACK_PATH, DelayScene, OUT_PATH } from './DelayScene';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, DrawSVGPlugin);

const ONE_WAY_MINUTES = 22;
const clock = (minutes: number) => {
  const whole = Math.floor(minutes);
  const seconds = Math.floor((minutes - whole) * 60);
  return `${String(whole).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * The problem, told by scrolling: the section is two screens tall and its content stays on one
 * (sticky) while a signal crosses from the crew to Earth and back and the clock runs to Mars's
 * worst case, 22 minutes each way. Scrolling is the wait.
 */
export function Delay() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node || reduced) return;
    const ctx = gsap.context(() => {
      const figure = node.querySelector<HTMLElement>('.delay-clock strong')!;
      const label = node.querySelector<HTMLElement>('.delay-clock span')!;
      const time = { minutes: 0 };
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: node, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
        defaults: { ease: 'none' },
      });
      // The answer's trail stays hidden until the question has arrived.
      gsap.set('.delay-back', { drawSVG: '0% 0%' });
      const route = (d: string) => ({ path: d, autoRotate: false, alignOrigin: [0.5, 0.5] as [number, number] });
      timeline
        // Out: the packet leaves the ship and the trail draws behind it, green to red.
        .fromTo('.delay-out', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 0)
        .fromTo('.delay-signal', { motionPath: { ...route(OUT_PATH), start: 0, end: 0 } }, { motionPath: { ...route(OUT_PATH), start: 0, end: 1 }, duration: 1 }, 0)
        .to(time, { minutes: ONE_WAY_MINUTES, duration: 1, onUpdate: () => { figure.textContent = clock(time.minutes); label.textContent = 'One way to Earth'; } }, 0)
        // Earth receives: its ring flashes.
        .fromTo('.delay-earth-ring', { opacity: 0, scale: 1 }, { opacity: 0.9, scale: 1.12, svgOrigin: '1052 192', duration: 0.12 }, 0.95)
        .to('.delay-earth-ring', { opacity: 0, duration: 0.25 }, 1.07)
        // Back: the answer returns below, and the clock keeps running.
        .fromTo('.delay-back', { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1, immediateRender: false }, 1)
        .fromTo('.delay-signal', { motionPath: { ...route(BACK_PATH), start: 0, end: 0 } }, { motionPath: { ...route(BACK_PATH), start: 0, end: 1 }, duration: 1, immediateRender: false }, 1)
        .to(time, { minutes: ONE_WAY_MINUTES * 2, duration: 1, onUpdate: () => { figure.textContent = clock(time.minutes); label.textContent = 'Round trip, question to answer'; } }, 1)
        .fromTo('.delay-close', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 1.55);
    }, node);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={root} id="problem" className="delay" aria-labelledby="delay-title">
      <div className="delay-sticky">
        <div className="wrap delay-wrap">
          <header className="delay-head">
            <h2 id="delay-title">Earth is minutes away. Emergencies are not.</h2>
            <p className="delay-lede">From Mars, a message takes between 3 and 22 minutes to reach Earth, and as long again for the answer to come back.</p>
          </header>
          <div className="delay-stage">
            <DelayScene />
            {/* The wait is told inside the drawing, between the two arcs. */}
            <div className="delay-readout">
              <div className="delay-clock" aria-hidden="true"><strong>{reduced ? clock(ONE_WAY_MINUTES * 2) : '00:00'}</strong><span>{reduced ? 'Round trip, question to answer' : 'One way to Earth'}</span></div>
              <p className="delay-close">So VITRUVIO runs on board and offline. The first answer never waits for Earth.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
