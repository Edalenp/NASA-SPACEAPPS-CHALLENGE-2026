import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { visualGuides, type VisualGuideId } from '../../data/guides';
import { MeasurementIllustration } from './MeasurementIllustration';
import { gsap } from 'gsap';
import './visual-guides.css';

const GUIDE_MOTION = { duration: 3, ease: 'power2.out' } as const;
const readReduced = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function subscribeReduced(listener: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

function AnimatedFigure({ guide, step }: { guide: VisualGuideId; step: number }) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const sequence = useRef({ token: 0 });
  const visible = useRef(true);
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'finished'>('idle');

  useEffect(() => {
    const node = root.current;
    const lifecycle = sequence.current;
    function pauseIfRunning() {
      if (timeline.current && !timeline.current.paused() && timeline.current.progress() < 1) {
        timeline.current.pause();
        setStatus('paused');
      }
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible.current = entries[0].isIntersecting;
      if (!visible.current) pauseIfRunning();
    });
    if (node) observer?.observe(node);
    const onVisibility = () => { if (document.hidden) pauseIfRunning(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      lifecycle.token++;
      timeline.current?.revert();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  useEffect(() => {
    if (reduced) timeline.current?.revert({ suppressEvents: false });
  }, [reduced]);

  function play(restart = false) {
    if (reduced || document.hidden || !visible.current || !root.current) return;
    if (!restart && status === 'paused') {
      timeline.current?.resume();
      setStatus('playing');
      return;
    }
    const token = ++sequence.current.token;
    timeline.current?.revert();
    const within = (motion: string) => [...root.current!.querySelectorAll<SVGElement>(`[data-guide-motion="${motion}"]`)];
    const place = within('place'), target = within('target'), reveal = within('reveal'), jaw = within('jaw');
    const tl = gsap.timeline({ paused: true, defaults: { ease: GUIDE_MOTION.ease },
      onComplete: () => { if (sequence.current.token === token) setStatus('finished'); },
      onInterrupt: () => { if (sequence.current.token === token) setStatus('idle'); },
    });
    if (target.length) tl.fromTo(target, { opacity: 0.2 }, { opacity: 1, duration: 0.6 }, 0);
    if (place.length) tl.fromTo(place, { x: 32, y: -20, opacity: 0.35 }, { x: 0, y: 0, opacity: 1, duration: 1.4 }, 0.2);
    if (jaw.length) tl.fromTo(jaw, { y: -14 }, { y: 0, duration: 0.8 }, 0.8);
    if (reveal.length) tl.fromTo(reveal, { opacity: 0 }, { opacity: 1, duration: 0.7 }, 1.6);
    tl.to(target.length ? target : place, { opacity: 1, duration: 0.8 }, GUIDE_MOTION.duration - 0.8);
    timeline.current = tl;
    setStatus('playing');
    tl.play(0);
  }
  function pause() { timeline.current?.pause(); setStatus('paused'); }

  return <div className="visual-guide-figure" ref={root} data-playback={reduced ? 'static' : status}>
    <MeasurementIllustration guide={guide} step={step} description={visualGuides[guide].steps[step].description} />
    <div className="visual-guide-playback" role="group" aria-label="Illustration playback">
      <button type="button" disabled={reduced} onClick={() => status === 'playing' ? pause() : play()}>
        {reduced ? 'Static illustration' : status === 'playing' ? 'Pause illustration' : status === 'paused' ? 'Resume illustration' : status === 'finished' ? 'Play again' : 'Play illustration'}
      </button>
      <button type="button" disabled={reduced} onClick={() => play(true)}>Replay illustration</button>
      <span>{reduced ? 'Reduced motion enabled' : status === 'paused' ? 'Paused' : status === 'playing' ? 'Playing · 3 s demonstration' : '3 s placement demonstration'}</span>
    </div>
    <p className="visual-guide-caption">Illustration only. Not a live reading or a measurement timer.</p>
  </div>;
}

/** Standalone, store-independent component for X's Guides panel or any measurement form. */
export function VisualMeasurementGuide({ guide, onRecord }: { guide: VisualGuideId; onRecord?: (guide: VisualGuideId) => void }) {
  const data = visualGuides[guide];
  const [step, setStep] = useState(0);
  const titleId = useId();
  const selected = data.steps[step];
  return <section className="visual-measurement-guide" aria-labelledby={titleId}>
    <header className="visual-guide-heading"><h3 id={titleId}>{data.title}</h3><p>{data.instrument}</p></header>
    <p className="visual-guide-preparation">{data.preparation}</p>
    <div className="visual-guide-layout">
      <AnimatedFigure key={`${guide}-${step}`} guide={guide} step={step} />
      <div className="visual-guide-instruction">
        <div className="visual-guide-step-selector" role="group" aria-label="Measurement steps">
          {data.steps.map((item, index) => <button key={item.title} type="button" aria-pressed={step === index} aria-label={`Step ${index + 1}: ${item.title}`} onClick={() => setStep(index)}>{index + 1}</button>)}
        </div>
        <p className="visual-guide-step-count">Step {step + 1} of {data.steps.length}</p>
        <h4>{selected.title}</h4><p>{selected.detail}</p>
        <div className="visual-guide-navigation">
          <button type="button" disabled={step === 0} onClick={() => setStep(index => index - 1)}>Previous step</button>
          <button type="button" disabled={step === data.steps.length - 1} onClick={() => setStep(index => index + 1)}>Next step</button>
        </div>
      </div>
    </div>
    <p className="visual-guide-note">{data.note}</p>
    <details className="visual-guide-source"><summary>Source: {data.source.title}</summary>
      <p>Reference checked {data.source.checkedAt}. This technique summary stays available offline. Follow the onboard kit’s instructions; pack-specific review is pending.</p>
      <a href={data.source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
    </details>
    {onRecord && <button type="button" className="visual-guide-record" onClick={() => onRecord(guide)}>Record this measurement</button>}
  </section>;
}
