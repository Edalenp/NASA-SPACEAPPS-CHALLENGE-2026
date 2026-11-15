import { useState } from 'react';
import { ArrowRight, Rotate3d } from 'lucide-react';
import { useMission } from '../../store/mission';
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
  const recorded = entries.some((entry) => entry.source !== 'simulator');
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(KEY, 'seen'); } catch { /* Optional display preference. */ } };
  if (!hydrated || dismissed || recorded || panel !== null) return null;
  return (
    <section className="first-check-welcome" aria-labelledby="first-check-heading">
      <span className="micro">Start here · first check-in</span>
      <h2 id="first-check-heading">Get your first early warning score.</h2>
      <p>The body shows your recorded health state. Start with seven observations to calculate NEWS2.</p>
      <ol>
        <li><b>01 · Measure</b><span>Follow the guide for each observation.</span></li>
        <li><b>02 · Record</b><span>Enter what you measured and preview it before saving.</span></li>
        <li><b>03 · Review</b><span>After 7/7, see your risk score out of 20 points.</span></li>
      </ol>
      <button type="button" className="btn btn-solid" onClick={() => { dismiss(); open('routine'); }}>Start guided daily check <ArrowRight size={14} aria-hidden="true" /></button>
      <button type="button" className="btn btn-ghost" onClick={dismiss}><Rotate3d size={14} aria-hidden="true" /> Explore the model first</button>
      <small>You can return through Daily check-in at the bottom left. Simulation readings do not replace your own check.</small>
    </section>
  );
}
