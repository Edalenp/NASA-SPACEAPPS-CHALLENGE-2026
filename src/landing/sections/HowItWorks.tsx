import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../typing';
import { usePointer } from '../hero/pointer';
import { heroClock } from '../hero/heroClock';
import { STAGES, twinDrive, type StepId } from './twinDrive';

gsap.registerPlugin(ScrollTrigger);
const Bust = lazy(() => import('../hero/Bust'));
const PlateFibers = lazy(() => import('../hero/FiberField').then((m) => ({ default: m.PlateFibers })));

interface Step { id: StepId; title: string; body: string }

/** What a crew member does with VITRUVIO, in the order they meet it. */
const STEPS: Step[] = [
  { id: 'measure', title: 'Measure with a guide.', body: 'A guided daily check walks through the seven NEWS2 observations and previews each reading against cited references before it is saved on the device.' },
  { id: 'read', title: 'Read your own body.', body: 'The twin takes each system’s state from the crew member’s own readings: grey without data, green when well, amber or red when something needs a look.' },
  { id: 'tell', title: 'Know who to tell.', body: 'The unmodified NEWS2 score and cited clinical limits name the reading behind an alert and plan contacts around Earth’s delay.' },
  { id: 'act', title: 'Act on board, step by step.', body: 'Emergency protocols guide one step at a time, time each check and record every answer for the handover.' },
];
/** The state the page's ground (and the plate's fibres) take for each step. */
const GROUND: Record<StepId, 'normal' | 'watch' | 'alert'> = { measure: 'normal', read: 'normal', tell: 'watch', act: 'alert' };
const HUD: Record<StepId, string> = { measure: 'Chest · observations', read: 'Whole body · six systems', tell: 'Left lung · respiration', act: 'Heart · pulse' };
const WIDE = '(min-width: 861px)';

/**
 * How it works, told on the body itself: the section holds two screens, its content stays on
 * one while the steps advance with the scroll, and the twin beside them changes to match: grey
 * while measuring, coloured by system when read, the reading behind an alert in amber, the heart
 * in red when it is time to act. A step can also be chosen directly.
 */
export function HowItWorks() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const notes = useRef<HTMLDivElement>(null);
  const twin = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [drive] = useState(twinDrive);
  const [active, setActive] = useState<StepId>('measure');
  const [visible, setVisible] = useState(false);
  const step = reduced ? 'read' : active;

  useEffect(() => drive.show(step), [drive, step]);
  useEffect(() => drive.attach(notes.current), [drive]);
  usePointer(twin, drive.pointer);
  // While the steps are on screen, the page's liquid takes the step's state.
  useEffect(() => {
    heroClock.lock = visible && !reduced ? GROUND[step] : null;
    return () => { heroClock.lock = null; };
  }, [visible, reduced, step]);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // On a wide screen the scroll through the section's second screen walks the steps.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || reduced) return;
    const media = gsap.matchMedia();
    media.add(WIDE, () => {
      trigger.current = ScrollTrigger.create({
        trigger: node, start: 'top top', end: 'bottom bottom',
        onUpdate: (self) => setActive(STEPS[Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length))].id),
      });
      return () => { trigger.current?.kill(); trigger.current = null; };
    });
    // On a phone the twin holds at the top and each step takes over as it reaches the middle.
    media.add(`not all and ${WIDE}`, () => {
      const steps = gsap.utils.toArray<HTMLElement>('.how-steps li', node);
      const triggers = steps.map((item, index) => ScrollTrigger.create({
        trigger: item, start: 'top 70%', end: 'bottom 70%',
        onToggle: (self) => { if (self.isActive) setActive(STEPS[index].id); },
      }));
      return () => triggers.forEach((one) => one.kill());
    });
    return () => media.revert();
  }, [reduced]);

  const choose = (index: number) => {
    const scroll = trigger.current;
    if (!scroll) { setActive(STEPS[index].id); return; }
    window.scrollTo({ top: scroll.start + ((index + 0.5) / STEPS.length) * (scroll.end - scroll.start), behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section ref={root} className="how" aria-labelledby="how-title">
      <div className="how-sticky">
        <div className="wrap how-grid">
          <div className="how-copy">
            <h2 id="how-title">Four steps, all on board.</h2>
            <ol className="how-steps">
              {STEPS.map((item, index) => (
                <li key={item.id} className={step === item.id ? 'is-on' : ''}>
                  <button type="button" aria-current={step === item.id ? 'step' : undefined} onClick={() => choose(index)}>
                    <span className="how-num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="how-title">{item.title}</span>
                  </button>
                  <div className="how-body"><p>{item.body}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div ref={twin} className={`how-twin is-${step}`}>
            <div className="how-plate">
              {/* The page's muscle fibres, seen closer, in the step's state; they zoom with the camera. */}
              <div className="how-ground" aria-hidden="true"><Suspense fallback={null}><PlateFibers running={visible} /></Suspense></div>
              <Suspense fallback={null}><Bust running={visible} reduced={reduced} drive={drive} className="how-twin-canvas" /></Suspense>
              <div ref={notes} className="how-notes" aria-hidden="true">
                {STAGES[step].notes.map((note) => (
                  <div key={note.system} className={`twin-note tone-${note.look}`} data-system={note.system}>
                    <span className="twin-note-label"><b>{note.label}</b><em>{note.value}</em><small>{note.todo}</small></span>
                  </div>
                ))}
              </div>
              {/* What the camera is on and how much it sees, as on an instrument. */}
              <div className="twin-hud" aria-hidden="true">
                <span>{HUD[step]}</span>
                <span>Field <b className="twin-hud-field">62 cm</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
