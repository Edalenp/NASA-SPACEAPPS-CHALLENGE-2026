import { useEffect, useRef, useState } from 'react';
import { useIntro } from '../features/twin/intro';
import { LoaderPlate } from './LoaderPlate';

/**
 * Nothing of the twin shows until it is whole: this plate covers the console while the model,
 * the habitat and their materials load, then fades and hands over to the opening scan.
 *
 * Loading comes in batches (the model first, the habitat's textures after), and the loader's
 * progress starts again with each one. The plate never shows that: its figure and its step only
 * move forward, holding where they are until the next batch passes them.
 */
export function SceneLoader() {
  const loading = useIntro((s) => s.loading);
  const progress = useIntro((s) => s.progress);
  const item = useIntro((s) => s.item);
  const ready = useIntro((s) => s.ready);
  const model = useIntro((s) => s.model);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const complete = ready && !loading;
  const stepNow = complete ? 2 : loading || progress < 100 ? 0 : 1;
  // Items finished, or the model's bytes when it is still arriving (it is most of the download).
  const fetched = Math.max(progress, model.total ? (model.loaded / model.total) * 100 : 0);
  const targetNow = complete ? 100 : Math.min(99, loading ? fetched * 0.85 : 92);
  // The furthest the plate has been; adjusted while rendering, so it never shows a step back.
  const [peak, setPeak] = useState({ step: 0, target: 0 });
  if (stepNow > peak.step || targetNow > peak.target) {
    setPeak({ step: Math.max(peak.step, stepNow), target: Math.max(peak.target, targetNow) });
  }
  const shown = useCountUp(peak.target);

  useEffect(() => {
    // Leave only once the figure and the bar have reached 100.
    if (!complete || shown < 100) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fade = window.setTimeout(() => setLeaving(true), reduced ? 0 : 260);
    const end = window.setTimeout(() => { setGone(true); useIntro.setState({ revealed: true }); }, reduced ? 0 : 260 + 520);
    return () => { window.clearTimeout(fade); window.clearTimeout(end); };
  }, [complete, shown]);

  if (gone) return null;
  const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
  const arriving = model.total > 0 && model.loaded < model.total;
  const label = peak.step === 0 ? (arriving ? `Anatomical model · ${mb(model.loaded)} / ${mb(model.total)} MB` : item || 'Starting the console') : peak.step === 1 ? 'Compiling materials' : '';
  return <LoaderPlate shown={shown} step={peak.step} item={label} leaving={leaving} />;
}

/**
 * The figure counts towards its target instead of jumping, so the number and the bar move as one.
 * One loop for the plate's whole life, chasing the latest target: restarting it on every download
 * event left the figure crawling behind the bytes. Timed by the clock, not by frames: a frame
 * stamp can come before the loop's own (a negative step, once shown as "-1"), and a busy GPU
 * compiling shaders must not slow the count to a crawl.
 */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const goal = useRef(target);
  useEffect(() => { goal.current = target; }, [target]);
  useEffect(() => {
    let frame = 0;
    let current = 0;
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      // Ease towards the target, at least 60 points a second so the end never drags.
      const gap = goal.current - current;
      if (gap > 0) current = Math.min(goal.current, current + Math.max(gap * 6 * dt, 60 * dt));
      const shown = Math.floor(current);
      setValue((previous) => (previous === shown ? previous : shown));
      if (current < 100) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  return value;
}
