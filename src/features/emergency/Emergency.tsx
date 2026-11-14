/**
 * Emergency mode drops the instrument: fixed dark ground, one instruction per
 * screen, at most two answers, no twin, no animation. Only the timer moves.
 */
import { useEffect, useRef, useState } from 'react';
import { protocols, type Protocol } from '../../data/protocols';
import { environments, formatDelay } from '../../data/mission';
import { useMission } from '../../store/mission';

function useElapsed() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - start) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function Emergency() {
  const setEmergency = useMission((s) => s.setEmergency);
  const env = environments[useMission((s) => s.environment)];
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const elapsed = useElapsed();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [protocol, stepId, done]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEmergency(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setEmergency]);

  const step = protocol && stepId ? protocol.steps[stepId] : null;

  return (
    <div className="emg" role="dialog" aria-modal="true" aria-label="Emergency mode">
      <header className="emg-top">
        <span>Emergency{protocol ? ` · ${protocol.name}` : ''}</span>
        <span className="emg-timer" aria-label={`Elapsed ${elapsed}`}>{elapsed}</span>
        <button type="button" className="emg-exit" onClick={() => setEmergency(false)}>Exit</button>
      </header>

      <main className="emg-body">
        {!protocol && (
          <>
            <h1 ref={heading} tabIndex={-1}>What is happening?</h1>
            <div className="emg-answers">
              {protocols.map((p) => (
                <button key={p.id} type="button" onClick={() => { setProtocol(p); setStepId(p.start); }}>{p.name}</button>
              ))}
            </div>
          </>
        )}
        {step && !done && (
          <>
            <h1 ref={heading} tabIndex={-1}>{step.say}</h1>
            <div className="emg-answers">
              {step.answers.map((a) => (
                <button key={a.label} type="button" onClick={() => (a.next ? setStepId(a.next) : setDone(true))}>{a.label}</button>
              ))}
            </div>
          </>
        )}
        {done && (
          <>
            <h1 ref={heading} tabIndex={-1}>Stay with your crewmate.</h1>
            <div className="emg-answers">
              <button type="button" onClick={() => setEmergency(false)}>Back to console</button>
            </div>
          </>
        )}
      </main>

      <footer className="emg-foot">
        <span>Earth answers in {env.delayMin < 0.05 ? 'seconds' : formatDelay(env.delayMin * 2)}. Act on board first.</span>
        <span>Draft protocol · pending clinical review</span>
      </footer>
    </div>
  );
}
