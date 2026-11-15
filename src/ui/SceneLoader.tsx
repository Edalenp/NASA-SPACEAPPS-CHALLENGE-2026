import { useEffect, useRef, useState } from 'react';
import { useIntro } from '../features/twin/intro';
import { Lockup } from './Logo';

const STEPS = ['Anatomical model & habitat', 'Materials & lighting', 'Body twin ready'] as const;

/**
 * Nothing of the twin shows until it is whole: this plate covers the console while the model,
 * the habitat and their materials load, then fades and hands over to the opening scan.
 */
export function SceneLoader() {
  const loading = useIntro((s) => s.loading);
  const progress = useIntro((s) => s.progress);
  const item = useIntro((s) => s.item);
  const ready = useIntro((s) => s.ready);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const complete = ready && !loading;
  const step = complete ? 2 : loading || progress < 100 ? 0 : 1;
  const target = complete ? 100 : Math.min(99, loading ? progress * 0.85 : 92);
  const shown = useCountUp(target);

  useEffect(() => {
    // Leave only once the figure and the bar have reached 100.
    if (!complete || shown < 100) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fade = window.setTimeout(() => setLeaving(true), reduced ? 0 : 260);
    const end = window.setTimeout(() => { setGone(true); useIntro.setState({ revealed: true }); }, reduced ? 0 : 260 + 520);
    return () => { window.clearTimeout(fade); window.clearTimeout(end); };
  }, [complete, shown]);

  if (gone) return null;
  return (
    <div className={`scene-loader ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite" aria-label={`Preparing the body twin, ${shown} percent`}>
      <div className="scene-loader-plate">
        <Lockup />
        <span className="scene-loader-scan" aria-hidden="true" />
        <div className="scene-loader-figure">
          <strong>{String(shown).padStart(2, '0')}</strong>
          <span>%</span>
        </div>
        <span className="scene-loader-track" aria-hidden="true"><i style={{ width: `${shown}%` }} /></span>
        <ol className="scene-loader-steps">
          {STEPS.map((label, index) => (
            <li key={label} className={index < step ? 'is-done' : index === step ? 'is-current' : ''}>
              <span className="micro">{String(index + 1).padStart(2, '0')}</span>
              {label}
            </li>
          ))}
        </ol>
        <span className="scene-loader-item">{step === 0 && item ? item : step === 1 ? 'Compiling materials' : ' '}</span>
      </div>
    </div>
  );
}

/** The figure counts towards its target instead of jumping, so the number and the bar move as one. */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // Ease towards the target, at least 40 points a second so the end never drags.
      const gap = target - current.current;
      current.current = gap <= 0 ? target : Math.min(target, current.current + Math.max(gap * 6 * dt, 40 * dt));
      setValue(Math.floor(current.current));
      if (current.current < target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}
