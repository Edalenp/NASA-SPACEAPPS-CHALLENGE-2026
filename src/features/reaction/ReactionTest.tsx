import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Play, RotateCcw } from 'lucide-react';
import { useMission } from '../../store/mission';
import { summarize, TEST_MS, type Trial } from './session';
import { ReactionRunner } from './runner';
import './reaction-test.css';

type Phase = 'idle' | 'running' | 'done' | 'stopped';

/**
 * RF-05: a real 60-second reaction test. A signal appears after a random 2–6 s wait; the crew
 * member taps it or presses Space. A press before the signal is a false start, no press within
 * 5 s is a lapse. The engine scores the trials; the mean, with the valid and failed trial counts,
 * is saved as a reaction-time reading from source "reactionTest". Leaving the tab stops the test.
 */
export function ReactionTest({ onSaved }: { onSaved?: () => void }) {
  const record = useMission((s) => s.record);
  const busy = useMission((s) => s.busy);
  const [phase, setPhase] = useState<Phase>('idle');
  const [showing, setShowing] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [left, setLeft] = useState(TEST_MS);
  const [error, setError] = useState('');
  const target = useRef<HTMLButtonElement>(null);
  const runner = useRef<ReactionRunner | null>(null);

  const stopRun = useCallback((next: Phase) => {
    runner.current?.stop();
    setShowing(false);
    setPhase(next);
  }, []);

  function start() {
    runner.current?.stop();
    runner.current = new ReactionRunner({
      onSignal: setShowing,
      onTrial: (trial) => setTrials((list) => [...list, trial]),
      onEnd: () => setPhase('done'),
    });
    setTrials([]);
    setError('');
    setLeft(TEST_MS);
    setPhase('running');
    runner.current.start();
    requestAnimationFrame(() => target.current?.focus());
  }

  // The countdown, and a stop when the page is hidden: a test run in the background is not valid.
  useEffect(() => {
    if (phase !== 'running') return;
    const tick = window.setInterval(() => setLeft(Math.max(0, TEST_MS - (runner.current?.elapsed() ?? TEST_MS))), 250);
    const hide = () => { if (document.hidden) stopRun('stopped'); };
    document.addEventListener('visibilitychange', hide);
    return () => { window.clearInterval(tick); document.removeEventListener('visibilitychange', hide); };
  }, [phase, stopRun]);
  useEffect(() => () => runner.current?.stop(), []);

  const summary = summarize(trials);
  async function save() {
    if (summary.meanMs === null) return;
    try {
      await record('reaction', Math.round(summary.meanMs), {
        source: 'reactionTest',
        reaction: { validTrials: summary.validTrials, failures: summary.failures, durationMs: TEST_MS },
      });
      onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the result.');
    }
  }

  return (
    <section className={`reaction-test is-${phase}`} aria-label="60-second reaction test">
      <header>
        <span className="micro">Reaction test · 60 s</span>
        {phase === 'running' && <span className="reaction-clock" aria-hidden="true">{Math.ceil(left / 1000)} s</span>}
      </header>
      {phase === 'running' && <progress value={TEST_MS - left} max={TEST_MS} aria-label="Test time elapsed" />}

      {phase === 'idle' && (
        <>
          <p>Sit somewhere quiet. A circle appears at random moments; tap it or press Space as soon as you see it. Do not press before it appears.</p>
          <button type="button" className="btn btn-solid" onClick={start}><Play size={14} aria-hidden="true" /> Start the 60-second test</button>
        </>
      )}

      {phase === 'running' && (
        <button
          ref={target}
          type="button"
          className={`reaction-target ${showing ? 'is-on' : ''}`}
          onPointerDown={(event) => { event.preventDefault(); runner.current?.press(); }}
          onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) runner.current?.press(); } }}
          aria-label={showing ? 'Signal on. Press now.' : 'Wait for the signal'}
        >
          <span className="reaction-signal" aria-hidden="true" />
          <span className="reaction-hint">{showing ? 'Now' : 'Wait…'}</span>
          <span className="reaction-count">{summary.validTrials} {summary.validTrials === 1 ? 'response' : 'responses'} · {summary.failures} {summary.failures === 1 ? 'failure' : 'failures'}</span>
        </button>
      )}

      {(phase === 'done' || phase === 'stopped') && (
        <>
          {phase === 'stopped' && <p role="alert">The test stopped because the app was left. Run it again for a valid result.</p>}
          <dl className="reaction-result" aria-live="polite">
            <div><dt>Mean reaction time</dt><dd><strong>{summary.meanMs === null ? '—' : Math.round(summary.meanMs)}</strong> ms</dd></div>
            <div><dt>Valid responses</dt><dd>{summary.validTrials}</dd></div>
            <div><dt>Failures</dt><dd>{summary.failures}<small>{summary.falseStarts} early · {summary.lapses} missed · {summary.tooFast} under 100 ms</small></dd></div>
          </dl>
          <p className="dialog-fine">Compare it with your own earlier results, not with other people: the result depends on this task and this device.</p>
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="reaction-actions">
            {phase === 'done' && (
              <button type="button" className="btn btn-solid" disabled={busy || summary.meanMs === null} onClick={() => void save()}>
                <Check size={14} aria-hidden="true" /> Save result
              </button>
            )}
            <button type="button" className="btn btn-outline" onClick={start}><RotateCcw size={14} aria-hidden="true" /> Run again</button>
          </div>
          {phase === 'done' && summary.meanMs === null && <p className="dialog-fine">No valid response was recorded, so there is nothing to save.</p>}
        </>
      )}
    </section>
  );
}
