import { lazy, Suspense, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { guides, ISS_KIT_SOURCE } from '../../data/guides';
import { plateForStep } from './art/plate-steps';
import { indicators, type IndicatorId } from '../../data/indicators';
import { useReducedMotion } from '../twin/environments/motion';
import { GuideText } from './GuideText';
import './inline-guide.css';

const MeasurementArt = lazy(() => import('./art/measurement').then((m) => ({ default: m.MeasurementArt })));

/** A compact walkthrough; automatic advancement illustrates the procedure, never times a measurement. */
export function InlineGuide({ id }: { id: IndicatorId }) {
  const guide = guides[id];
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const steps = guide?.validation === 'draft' ? [] : guide?.steps ?? [];
  const playing = !paused && !reduced && steps.length > 1;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (!document.hidden) setStep((current) => (current + 1) % steps.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [playing, step, steps.length]);
  if (!guide) {
    // Never an empty pane: say so plainly if a reading ever ships without a guide.
    return (
      <article className="inline-guide" aria-label={`How to measure ${indicators[id].name}`}>
        <div className="inline-guide-heading">
          <span className="micro">How to measure</span>
          <h3>{indicators[id].name}</h3>
          <p>No measurement guide is available for this reading yet. Follow your onboard procedure.</p>
        </div>
      </article>
    );
  }
  const plate = plateForStep(id, step);
  const move = (direction: number) => {
    setPaused(true);
    setStep((current) => (current + direction + steps.length) % steps.length);
  };
  return (
    <article className="inline-guide" aria-label={`How to measure ${indicators[id].name}`}>
      <div className="inline-guide-heading">
        <span className="micro">How to measure</span>
        <h3>{indicators[id].name}</h3>
        <p><GuideText text={guide.instrument} /></p>
      </div>
      <div className={`inline-guide-body ${plate ? 'has-art' : ''}`}>
        {plate && steps.length > 0 && (
          <div className="inline-guide-art">
            <Suspense fallback={<div className="guide-art-loading" />}>
              <MeasurementArt guide={plate.plate} step={plate.pose} count={plate.count} description={plate.description} />
            </Suspense>
          </div>
        )}
        <div className="inline-guide-instruction">
          <span className="micro">{steps.length ? `Step ${String(step + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}` : 'Draft'}</span>
          <p className="inline-guide-step" key={step} aria-live={playing ? 'off' : 'polite'}>
            <GuideText text={steps[step] ?? 'Steps are withheld until a source is reviewed.'} />
          </p>
          {steps.length > 1 && (
            <div className="inline-guide-controls" role="group" aria-label="Guide playback">
              <button type="button" aria-label="Previous step" onClick={() => move(-1)}><ChevronLeft size={16} /></button>
              <button type="button" aria-label={playing ? 'Pause steps' : 'Play steps'} aria-pressed={playing} disabled={reduced} onClick={() => setPaused((value) => !value)}>
                {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Auto · 7 s' : 'Manual'}
              </button>
              <button type="button" aria-label="Next step" onClick={() => move(1)}><ChevronRight size={16} /></button>
            </div>
          )}
          <span className="inline-guide-note">Illustration only. Follow the time stated in each step.</span>
        </div>
      </div>
      <details className="inline-guide-sources">
        <summary>Equipment & sources</summary>
        <p>{guide.kit ? `${guide.kit.item} · ${guide.kit.pack} · ${guide.kit.slot}` : guide.kitNote}</p>
        {guide.source && <a href={guide.source.url} target="_blank" rel="noreferrer">{guide.source.title}</a>}
        {guide.sourceScope && <p>{guide.sourceScope}</p>}
        {(guide.kit || guide.kitNote?.includes('2015')) && <p><a href={ISS_KIT_SOURCE.url} target="_blank" rel="noreferrer">NASA · ISS equipment checklist (2015), p. 9</a> · Historical inventory; not a current kit or technique source.</p>}
        <p>{guide.validation === 'self-report' ? 'Self-report.' : 'Onboard procedure and clinical review pending.'}</p>
      </details>
    </article>
  );
}
