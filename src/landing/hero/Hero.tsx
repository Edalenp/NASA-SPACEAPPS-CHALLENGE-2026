import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { LAB_PATH } from '../../routes';
import { useHeroPhase, type Phase } from './heroClock';
import { Count } from './Count';
import { heroDrive } from './heroDrive';
import { usePointer } from './pointer';
import { useTyping, useReducedMotion } from '../typing';

const Bust = lazy(() => import('./Bust'));

type Tone = 'normal' | 'watch' | 'alert';
type Key = 'pulse' | 'spo2' | 'breathing' | 'news';

/** Illustrative readings for each state, scored the way NEWS2 scores them. */
const READINGS: Record<Phase, Record<Key, [number, Tone]> & { risk: string }> = {
  normal: { pulse: [72, 'normal'], spo2: [98, 'normal'], breathing: [14, 'normal'], news: [0, 'normal'], risk: 'Low risk' },
  watch: { pulse: [108, 'watch'], spo2: [93, 'watch'], breathing: [23, 'watch'], news: [5, 'watch'], risk: 'Medium risk' },
  alert: { pulse: [134, 'alert'], spo2: [90, 'alert'], breathing: [27, 'alert'], news: [9, 'alert'], risk: 'High risk' },
};

/** Each card's scale and its NEWS2 zero-point band, drawn as a small ruler under the figure. */
const CARDS: { key: Key; label: string; unit: string; min: number; max: number; band: [number, number] }[] = [
  { key: 'pulse', label: 'Heart rate', unit: 'bpm', min: 40, max: 150, band: [51, 90] },
  { key: 'spo2', label: 'Blood oxygen', unit: '% SpO₂', min: 84, max: 100, band: [96, 100] },
  { key: 'breathing', label: 'Breathing', unit: '/min', min: 6, max: 32, band: [12, 20] },
  { key: 'news', label: 'NEWS2', unit: '/ 20', min: 0, max: 20, band: [0, 4] },
];
const TONE_LABEL: Record<Tone, string> = { normal: 'Normal', watch: 'Watch', alert: 'Alert' };
const at = (value: number, min: number, max: number) => `${((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100}%`;


/**
 * The hero: a liquid in the state's colours, the body twin from chest to crown looking at the
 * pointer, and four readings around its head that change with the state. Every few seconds an
 * impact turns normal into watch, watch into alert, and back, the way a crew member's own numbers
 * would turn the console.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const phase = useHeroPhase((s) => s.phase);
  const section = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const lede = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(true);
  usePointer(section);
  useTyping(title, { delay: 0.35, speed: 0.045, reduced });
  useTyping(lede, { delay: 2.1, speed: 0.012, reduced });

  // Render the hero's two canvases only while it is on screen.
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The body writes where its head and heart are on screen; the readings sit around them.
  const [drive] = useState(heroDrive);
  useEffect(() => drive.attach(section.current), [drive]);

  const r = READINGS[phase];
  return (
    <section ref={section} className={`hero is-${phase}`} aria-label="VITRUVIO">
      <div className="hero-bust" aria-hidden="true">
        <Suspense fallback={null}><Bust running={visible} reduced={reduced} drive={drive} /></Suspense>
      </div>
      <div className="hero-readings" aria-label="Illustrative readings">
        {CARDS.map((card) => {
          const [value, tone] = r[card.key];
          return (
            <div key={card.key} className={`reading is-${card.key} tone-${tone}`}>
              <span className="reading-label">{card.label}<em>{card.key === 'news' ? r.risk : TONE_LABEL[tone]}</em></span>
              <span className="reading-figure"><b><Count value={value} reduced={reduced} /></b><small>{card.unit}</small></span>
              <span className="reading-scale" aria-hidden="true">
                <i className="reading-band" style={{ left: at(card.band[0], card.min, card.max), width: `calc(${at(card.band[1], card.min, card.max)} - ${at(card.band[0], card.min, card.max)})` }} />
                <i className="reading-needle" style={{ left: at(value, card.min, card.max) }} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="hero-copy">
        <span className="hero-eyebrow">NASA Space Apps 2026</span>
        <h1 ref={title}>Medical answers before Earth can reply.</h1>
        <p ref={lede}>VITRUVIO turns an astronaut’s own readings into a living body twin, an early warning score and the next step to take.</p>
        <a className="landing-cta is-primary hero-cta" href={LAB_PATH}>Open the lab <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </section>
  );
}
