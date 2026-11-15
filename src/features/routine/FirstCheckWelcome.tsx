import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Rotate3d } from 'lucide-react';
import { useMission } from '../../store/mission';
import { tourSeen, useTour } from '../tour/tourSteps';
import { useIntro } from '../twin/intro';
import './first-check.css';

const KEY = 'vt-first-check-welcome';
function dismissedBefore() { try { return localStorage.getItem(KEY) === 'seen'; } catch { return false; } }

/** A first-use entry point, based on real local records rather than a fabricated score. */
export function FirstCheckWelcome() {
  const hydrated = useMission((s) => s.hydrated);
  const entries = useMission((s) => s.entries);
  const panel = useMission((s) => s.panel);
  const open = useMission((s) => s.open);
  const [dismissed, setDismissed] = useState(dismissedBefore);
  // The tour comes first: the card waits for the opening scan and for the tour to be taken or
  // skipped (tourSeen), not only for a running tour, which starts a moment after the scan.
  const touring = useTour((s) => s.step !== null);
  const introDone = useIntro((s) => s.done);
  // Any reading, the loaded simulation included, means the console already has a state to show.
  const recorded = entries.length > 0;
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(KEY, 'seen'); } catch { /* Optional display preference. */ } };
  const visible = hydrated && introDone && !dismissed && !recorded && panel === null && !touring && tourSeen();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!visible) return;
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);
  if (!visible) return null;
  return (
    <>
    {/* The same dimmed, blurred backdrop as every other dialog, so the card holds the focus. */}
    <div className="first-check-scrim" aria-hidden="true" onClick={dismiss} />
    <section className="first-check-welcome" role="dialog" aria-modal="true" aria-labelledby="first-check-heading">
      <span className="micro">Start here · first check-in</span>
      <h2 id="first-check-heading">Get your first early warning score.</h2>
      <p>The body shows your recorded health state. Start with seven observations to calculate NEWS2.</p>
      <ol>
        <li><b>01 · Measure</b><span>Follow the guide for each observation.</span></li>
        <li><b>02 · Record</b><span>Enter what you measured and preview it before saving.</span></li>
        <li><b>03 · Review</b><span>After 7/7, see your risk score out of 20 points.</span></li>
      </ol>
      <button ref={first} type="button" className="btn btn-solid" onClick={() => { dismiss(); open('routine'); }}>Start guided daily check <ArrowRight size={14} aria-hidden="true" /></button>
      <button type="button" className="btn btn-ghost" onClick={dismiss}><Rotate3d size={14} aria-hidden="true" /> Explore the model first</button>
      <small>You can return through Daily check-in at the bottom left. Simulation readings do not replace your own check.</small>
    </section>
    </>
  );
}
