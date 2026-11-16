import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { LAB_PATH } from '../../routes';
import { useReducedMotion } from '../typing';
import { PwaAccess } from '../../pwa/PwaAccess';

/** What the console shows, each with its own capture of the real screen. */
const PARTS = [
  { id: 'twin', title: 'The body twin', body: 'Six systems, each coloured by the crew member’s own readings.', shot: '/landing/lab-twin.jpg', alt: 'The console with the respiratory system open: both lungs in outline, the bronchial tree inside, and the oxygen saturation reading.' },
  { id: 'news', title: 'The early warning score', body: 'NEWS2, with the reading behind every point.', shot: '/landing/lab-news2.jpg', alt: 'The early warning score: NEWS2 at 0 of 20, each of the seven observations with its value and its points.' },
  { id: 'check', title: 'The daily check', body: 'Seven observations, guided one at a time.', shot: '/landing/lab-check.jpg', alt: 'The daily check-in: seven of seven NEWS2 observations recorded, with today’s readings.' },
  { id: 'emergency', title: 'Emergency', body: 'One press to a timed, guided protocol.', shot: '/landing/lab-emergency.jpg', alt: 'Emergency mode: what is happening, with a protocol for a collapsed crewmate and one for chest pain.' },
] as const;

/** Seconds each screen holds before the next one comes up on its own. */
const HOLD = 6;

/**
 * The real console, shown as a screen rather than a picture beside a list: the title and the way
 * in on one line, the console wide underneath, and its four parts as tabs below it. The tabs run
 * on their own, each with a bar that fills while its screen holds; touching one takes over.
 */
export function Lab() {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  // The tour moves on while the section is in view and no one has chosen a part.
  const running = inView && !held && !reduced;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % PARTS.length), HOLD * 1000);
    return () => window.clearTimeout(timer);
  }, [running, active]);
  const choose = (index: number) => { setActive(index); setHeld(true); };
  const part = PARTS[active];

  return (
    <section ref={root} className="lab" aria-labelledby="lab-title">
      <div className="wrap lab-wrap">
        <header className="lab-head">
          <h2 id="lab-title">The console the crew opens every day.</h2>
          <div className="lab-intro">
            <p>Open once online. Continue offline after setup, in your browser or as an installed app.</p>
            <div className="lab-entry-actions"><a className="landing-cta is-primary" href={LAB_PATH}>Open the lab <ArrowRight size={16} aria-hidden="true" /></a><PwaAccess variant="landing" /></div>
          </div>
        </header>
        <div className="lab-stage">
        {/* Arrows on either side of the screen: step through the four parts by hand. */}
        <button type="button" className="lab-arrow is-prev" aria-label="Previous part of the console" onClick={() => choose((active + PARTS.length - 1) % PARTS.length)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <a className="lab-screen" href={LAB_PATH} aria-label={`Open the lab: ${part.title}`}>
          <span className="lab-bar" aria-hidden="true">
            <span className="lab-dots"><i /><i /><i /></span>
            <span>vitruvio / lab · {part.title}</span>
            <span>Offline · on board</span>
          </span>
          <span className="lab-shot">
            {PARTS.map((item, index) => (
              <img key={item.id} className={index === active ? 'is-on' : ''} src={item.shot} alt={index === active ? item.alt : ''} aria-hidden={index === active ? undefined : true} width={1400} height={793} loading="lazy" decoding="async" />
            ))}
          </span>
        </a>
        <button type="button" className="lab-arrow is-next" aria-label="Next part of the console" onClick={() => choose((active + 1) % PARTS.length)}><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
        <ol className="lab-tabs" role="tablist" aria-label="What the console shows">
          {PARTS.map((item, index) => (
            <li key={item.id} className={index === active ? 'is-on' : ''}>
              <button type="button" role="tab" aria-selected={index === active} onClick={() => choose(index)}>
                <span className="lab-num">{String(index + 1).padStart(2, '0')}</span>
                <b>{item.title}</b>
                <small>{item.body}</small>
                <span className="lab-progress" aria-hidden="true">
                  <i key={`${active}-${running}`} className={index === active && running ? 'is-running' : index === active ? 'is-full' : ''} style={{ animationDuration: `${HOLD}s` }} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
