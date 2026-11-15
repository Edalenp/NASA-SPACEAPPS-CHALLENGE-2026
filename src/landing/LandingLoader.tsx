import { useEffect, useState } from 'react';
import { useIntro } from '../features/twin/intro';
import { LoaderPlate } from '../ui/LoaderPlate';
import { useCountUp } from '../ui/useCountUp';
import { CONSOLE_ASSETS, LANDING_STEPS, markLoaded, useLandingLoad } from './loadState';
/** Past this, the page shows whatever is ready rather than hold a visitor on the plate. */
const PATIENCE_MS = 15_000;

/**
 * The landing's loading plate, the console's own: it covers the page while the model downloads,
 * the twin and the fibres draw their first frames, and the console's pictures reach the cache, so
 * the hero enters whole and /lab opens without a second wait. Its figure only moves forward.
 */
export function LandingLoader() {
  const model = useIntro((s) => s.model);
  const { twin, fibres, console: assets } = useLandingLoad();
  const [late, setLate] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const bytes = model.total ? model.loaded / model.total : 0;
  const drawn = twin && fibres;
  const complete = late || (drawn && assets);
  const step = complete ? 3 : drawn ? 2 : bytes >= 1 ? 1 : 0;
  const target = complete ? 100 : drawn ? 92 : bytes >= 1 ? 72 + (twin ? 10 : 0) + (fibres ? 8 : 0) : bytes * 72;
  const [peak, setPeak] = useState(0);
  if (target > peak) setPeak(target);
  const shown = useCountUp(peak);

  // Hold the page still under the plate.
  useEffect(() => {
    if (gone) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = before; };
  }, [gone]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLate(true), PATIENCE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  // Once the twin is drawn, the console's pictures go into the cache (the code itself is cached
  // by the service worker); each settles whether or not it arrived.
  useEffect(() => {
    if (!twin) return;
    let live = true;
    void Promise.allSettled(CONSOLE_ASSETS.map((url) => fetch(url, { cache: 'force-cache' }).then((r) => r.blob()))).then(() => { if (live) markLoaded('console'); });
    return () => { live = false; };
  }, [twin]);
  useEffect(() => {
    if (!complete || shown < 100) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fade = window.setTimeout(() => setLeaving(true), reduced ? 0 : 240);
    const end = window.setTimeout(() => { setGone(true); useLandingLoad.setState({ ready: true }); }, reduced ? 0 : 240 + 520);
    return () => { window.clearTimeout(fade); window.clearTimeout(end); };
  }, [complete, shown]);

  if (gone) return null;
  const mb = (value: number) => (value / 1e6).toFixed(1);
  const item = step === 0
    ? (model.total ? `Anatomical model · ${mb(model.loaded)} / ${mb(model.total)} MB` : 'Starting')
    : step === 1 ? 'Drawing the twin and the fibres' : step === 2 ? 'Console pictures' : '';
  return <LoaderPlate shown={shown} step={step} item={item} leaving={leaving} steps={LANDING_STEPS} label="Preparing VITRUVIO" />;
}
