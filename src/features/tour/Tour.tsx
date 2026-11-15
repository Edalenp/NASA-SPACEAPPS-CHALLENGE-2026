import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { tourSeen, tourSteps, useTour } from './tour';
import { useIntro } from '../twin/intro';
import { useMission } from '../../store/mission';
import { TourArt } from './TourArt';
import './tour.css';

const PAD = 6;
interface Box { top: number; left: number; right: number; bottom: number; width: number; height: number }
const CARD = { width: 340, gap: 14 };

/** Where the callout goes: beside the lit part, on whichever side has room, kept on screen. */
function place(rect: Box, height: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const room = { below: vh - rect.bottom, above: rect.top, right: vw - rect.right, left: rect.left };
  let top: number;
  let left: number;
  if (room.right >= CARD.width + CARD.gap * 2 && rect.height > 200) {
    left = rect.right + CARD.gap; top = rect.top + 12;
  } else if (room.left >= CARD.width + CARD.gap * 2 && rect.height > 200) {
    left = rect.left - CARD.width - CARD.gap; top = rect.top + 12;
  } else if (room.below >= height + CARD.gap) {
    top = rect.bottom + CARD.gap; left = rect.left + rect.width / 2 - CARD.width / 2;
  } else {
    top = rect.top - height - CARD.gap; left = rect.left + rect.width / 2 - CARD.width / 2;
  }
  return {
    top: Math.max(12, Math.min(top, vh - height - 12)),
    left: Math.max(12, Math.min(left, vw - CARD.width - 12)),
  };
}

/**
 * A guided tour for first-time users: the console dims except for one part, with a callout that
 * says what it is. Next, Back and Skip; Esc skips and the arrow keys step. It starts by itself
 * once, after the opening scan, and the ? button in the header replays it.
 */
export function Tour() {
  const step = useTour((s) => s.step);
  const go = useTour((s) => s.go);
  const end = useTour((s) => s.end);
  const start = useTour((s) => s.start);
  const introDone = useIntro((s) => s.done);
  const panel = useMission((s) => s.panel);
  const [rect, setRect] = useState<Box | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [cardHeight, setCardHeight] = useState(240);
  useLayoutEffect(() => { if (cardRef.current) setCardHeight(cardRef.current.offsetHeight); }, [step]);

  useEffect(() => {
    if (introDone && panel === null && !tourSeen()) {
      const timer = window.setTimeout(start, 900);
      return () => window.clearTimeout(timer);
    }
  }, [introDone, panel, start]);

  useLayoutEffect(() => {
    if (step === null) return;
    const measure = () => {
      const { target, crop } = tourSteps[step];
      const element = document.querySelector(target);
      if (!element) { setRect(null); return; }
      const r = element.getBoundingClientRect();
      const [l, t, rr, b] = crop ?? [0, 0, 1, 1];
      const box = { left: r.left + r.width * l, top: r.top + r.height * t, right: r.left + r.width * rr, bottom: r.top + r.height * b };
      setRect({ ...box, width: box.right - box.left, height: box.bottom - box.top });
    };
    measure();
    window.addEventListener('resize', measure);
    const interval = window.setInterval(measure, 400);
    return () => { window.removeEventListener('resize', measure); window.clearInterval(interval); };
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') end();
      if (event.key === 'ArrowRight') { if (step < tourSteps.length - 1) go(step + 1); else end(); }
      if (event.key === 'ArrowLeft' && step > 0) go(step - 1);
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [step, go, end]);

  if (step === null) return null;
  const current = tourSteps[step];
  const last = step === tourSteps.length - 1;
  const spot = rect && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
  const card = rect ? place(rect, cardHeight) : { top: window.innerHeight / 2 - cardHeight / 2, left: window.innerWidth / 2 - CARD.width / 2 };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {spot ? <div className="tour-spot" style={spot}><i /><i /><i /><i /></div> : <div className="tour-dim" />}
      <section ref={cardRef} className="tour-card" style={{ ...card, width: CARD.width }}>
        <header>
          <span className="micro">Tour · {String(step + 1).padStart(2, '0')} / {String(tourSteps.length).padStart(2, '0')}</span>
          <button type="button" className="icon-button" aria-label="Skip the tour" onClick={end}><X size={14} aria-hidden="true" /></button>
        </header>
        <div className="tour-head">
          <TourArt name={current.art} />
          <h2 id="tour-title">{current.title}</h2>
        </div>
        <p>{current.body}</p>
        <span className="tour-progress" aria-hidden="true">
          {tourSteps.map((_, index) => <i key={index} className={index <= step ? 'is-on' : ''} />)}
        </span>
        <footer>
          <button type="button" className="btn btn-ghost" onClick={end}>Skip tour</button>
          {step > 0 && <button type="button" className="btn btn-outline" onClick={() => go(step - 1)}><ArrowLeft size={14} aria-hidden="true" /> Back</button>}
          <button type="button" className="btn btn-solid" autoFocus onClick={() => (last ? end() : go(step + 1))}>
            {last ? 'Done' : 'Next'} <ArrowRight size={14} aria-hidden="true" />
          </button>
        </footer>
      </section>
    </div>
  );
}
