import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Rotate3d } from 'lucide-react';
import { useMission } from '../../store/mission';
import { tourSeen, useTour } from '../tour/tourSteps';
import { useIntro } from '../twin/intro';
import { missionDay } from '../measurements/adapter';
import './first-check.css';

import { crew } from '../../data/mission';
/** Seen once for the first check ever, then once per mission day for that day's check. */
const key = (day: string | null) => `vt-first-check-welcome:${crew.code}${day ? `:${day}` : ''}`;
function dismissedBefore(day: string | null) { try { return localStorage.getItem(key(day)) === 'seen'; } catch { return false; } }

/** A first-use entry point, based on real local records rather than a fabricated score. */
export function FirstCheckWelcome() {
  const hydrated = useMission((s) => s.hydrated);
  const entries = useMission((s) => s.entries);
  const panel = useMission((s) => s.panel);
  const open = useMission((s) => s.open);
  const now = useMission((s) => s.now);
  const missionStart = useMission((s) => s.missionStart);
  // The tour comes first: the card waits for the opening scan and for the tour to be taken or
  // skipped (tourSeen), not only for a running tour, which starts a moment after the scan.
  const touring = useTour((s) => s.step !== null);
  const introDone = useIntro((s) => s.done);
  // The very first check: no reading at all yet. A new day: readings exist, but none of the crew
  // member's own today (simulated readings never replace their own check), so the day's check is
  // where to start; that card shows once each mission day.
  const today = now.slice(0, 10);
  const first = entries.length === 0;
  const checkedToday = entries.some((e) => e.timestamp.slice(0, 10) === today && e.timestamp <= now && e.source !== 'simulator');
  const day = first ? null : today;
  const [dismissedDay, setDismissedDay] = useState<string | null>(null);
  const dismissed = dismissedDay === (day ?? 'first') || dismissedBefore(day);
  const dismiss = () => { setDismissedDay(day ?? 'first'); try { localStorage.setItem(key(day), 'seen'); } catch { /* Optional display preference. */ } };
  const visible = hydrated && introDone && !dismissed && (first || !checkedToday) && panel === null && !touring && tourSeen();
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!visible) return;
    start.current?.focus();
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
      <span className="micro">{first ? 'Start here · first check-in' : `Day ${String(missionDay(now, missionStart)).padStart(3, '0')} · new check-in`}</span>
      <h2 id="first-check-heading">{first ? 'Get your first early warning score.' : 'A new day: check in to light the twin.'}</h2>
      <p>{first
        ? 'The body shows your recorded health state. Start with seven observations to calculate NEWS2.'
        : 'Each mission day starts empty, so the systems stay grey until today’s seven observations are in. Yesterday’s readings stay in Trends.'}</p>
      <ol>
        <li><b>01 · Measure</b><span>Follow the guide for each observation.</span></li>
        <li><b>02 · Record</b><span>Enter what you measured and preview it before saving.</span></li>
        <li><b>03 · Review</b><span>After 7/7, see your risk score out of 20 points.</span></li>
      </ol>
      <button ref={start} type="button" className="btn btn-solid" onClick={() => { dismiss(); open('routine'); }}>Start guided daily check <ArrowRight size={14} aria-hidden="true" /></button>
      <button type="button" className="btn btn-ghost" onClick={dismiss}><Rotate3d size={14} aria-hidden="true" /> Explore the model first</button>
      <small>You can return through Daily check-in at the bottom left. Simulation readings do not replace your own check.</small>
    </section>
    </>
  );
}
