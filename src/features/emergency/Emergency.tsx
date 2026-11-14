/** Full-screen emergency guidance. No changes to X's store, app shell or shared styles. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { protocols, type Step } from '../../data/protocols';
import { crew, environments, formatDelay } from '../../data/mission';
import { useMission } from '../../store/mission';
import { emergencyJournal } from './journal';
import { abortCase, answerCase, attachAssessment, beginCase, confirmContact, currentStep, emergencyReport, formatElapsed, stepSeconds, type EmergencySession } from './workflow';
import { assessEmergencyReadings, consoleEvidence, evidenceSignature, toEngineEnvironment } from './assessment';
import { EscalationPanel, ReadingSnapshot } from './EscalationPanel';
import type { ContactRole } from '../../engine/escalation';
import './emergency.css';

type View = 'choose' | 'care' | 'summary' | 'records' | 'leave' | 'replace';

function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [running]);
  return now;
}

function Sources({ step }: { step: Step }) {
  return (
    <div className="emergency-sources">
      {step.sources.map(source => (
        <details key={source.url}>
          <summary>Source: {source.title}</summary>
          <p>{source.note}</p>
          <p>Reference checked {source.checkedAt}. Summary available offline.</p>
          <a href={source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
        </details>
      ))}
    </div>
  );
}

function StepTimer({ session, now }: { session: EmergencySession; now: number }) {
  const step = currentStep(session);
  if (!step?.timer) return null;
  const { elapsed, remaining } = stepSeconds(session, now);
  return (
    <div className="emergency-step-timer">
      <span>{step.timer.label}</span>
      <strong role="timer" aria-live="off" aria-label={remaining === null ? 'Time on this step' : 'Time remaining for this check'}>
        {formatElapsed(remaining ?? elapsed)}
      </strong>
      {remaining === 0 && <p role="status">The check time has ended. Choose what you observed.</p>}
    </div>
  );
}

function VisitLog({ session }: { session: EmergencySession }) {
  return (
    <ol className="emergency-log">
      {session.visits.map((visit, index) => {
        const action = session.execution.steps[index].action;
        return (
          <li key={`${index}-${visit.enteredAt}`}>
            <p><b>{action.text}</b></p>
            <p>{visit.answer ? `Confirmed: ${visit.answer}` : 'Not yet confirmed'}</p>
            <p className="emergency-log-time">
              Entered <time dateTime={visit.enteredAt}>{new Date(visit.enteredAt).toLocaleString('en-GB')}</time>
              {visit.answeredAt && <> · Confirmed <time dateTime={visit.answeredAt}>{new Date(visit.answeredAt).toLocaleTimeString('en-GB')}</time></>}
            </p>
            <a href={action.sourceUrl} target="_blank" rel="noreferrer">{action.sourceTitle} ↗</a>
          </li>
        );
      })}
    </ol>
  );
}

export function Emergency() {
  const setEmergency = useMission(s => s.setEmergency);
  const environmentId = useMission(s => s.environment);
  const readings = useMission(s => s.readings);
  const entries = useMission(s => s.entries);
  const availableEvidence = useMemo(() => consoleEvidence(readings, entries), [readings, entries]);
  const journal = useSyncExternalStore(emergencyJournal.subscribe, emergencyJournal.getSnapshot);
  const unfinished = journal.sessions.findLast(s => s.execution.status === 'inProgress');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>('choose');
  const [downloaded, setDownloaded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const session = journal.sessions.find(s => s.execution.id === activeId);
  const step = session ? currentStep(session) : undefined;
  const assessment = session?.assessments?.at(-1);
  const readingsChanged = assessment && assessment.signature !== evidenceSignature(availableEvidence);
  const running = view === 'care' && session?.execution.status === 'inProgress';
  const now = useNow(running);
  const env = environments[environmentId];
  const delay = session?.environment.communicationDelayMinutes ?? env.delayMin;
  const elapsed = session ? Math.max(0, Math.floor(((session.endedAt ? Date.parse(session.endedAt) : now) - Date.parse(session.execution.startedAt!)) / 1000)) : 0;

  useEffect(() => {
    if (root.current) root.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [view, activeId, session?.visits.length]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (view === 'care') setView('leave');
        else if (view === 'leave' || view === 'replace') setView(session ? 'care' : 'choose');
        else setEmergency(false);
      }
      if (event.key === 'Tab') {
        const items = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, select, input') ?? [])].filter(el => el.getClientRects().length > 0);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, session, setEmergency]);

  function start(protocolId: string) {
    // The choose screen never offers new cases while a previous one is in progress.
    if (unfinished) return;
    const record = beginCase(protocolId, 'unassigned', { id: environmentId, name: env.name, communicationDelayMinutes: env.delayMin }, new Date().toISOString());
    emergencyJournal.save(record);
    setActiveId(record.execution.id);
    setDownloaded(false);
    setView('care');
  }
  function answer(index: number, visitIndex: number) {
    const latest = emergencyJournal.getSnapshot().sessions.find(s => s.execution.id === activeId);
    if (!latest) return;
    const next = answerCase(latest, visitIndex, index, new Date().toISOString());
    if (next === latest) return;
    emergencyJournal.save(next);
    if (next.execution.status === 'completed') setView('summary');
  }
  function resume(record: EmergencySession) {
    setActiveId(record.execution.id);
    setDownloaded(false);
    setView(record.execution.status === 'inProgress' ? 'care' : 'summary');
  }
  function linkReadings() {
    const latest = emergencyJournal.getSnapshot().sessions.find(s => s.execution.id === activeId);
    if (!latest) return;
    const captured = assessEmergencyReadings({ id: crew.code, name: crew.name }, toEngineEnvironment(latest.environment), availableEvidence, new Date().toISOString());
    emergencyJournal.save(attachAssessment(latest, captured));
  }
  function recordContact(role: ContactRole) {
    const latest = emergencyJournal.getSnapshot().sessions.find(s => s.execution.id === activeId);
    if (latest) emergencyJournal.save(confirmContact(latest, role, new Date().toISOString()));
  }
  function exportRecord() {
    if (!session) return;
    const url = URL.createObjectURL(new Blob([emergencyReport(session)], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `vitruvio-emergency-${session.execution.id}.txt`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  function exit() {
    if (session?.execution.status === 'inProgress' && view === 'care') setView('leave');
    else setEmergency(false);
  }

  return (
    <div className="emg emergency-flow" role="dialog" aria-modal="true" aria-labelledby="emergency-title" ref={root}>
      <header className="emg-top">
        <span>Emergency{session ? ` · ${session.execution.title}` : ''}</span>
        {session && <span className="emg-timer" role="timer" aria-live="off" aria-label="Case elapsed time">{formatElapsed(elapsed)}</span>}
        <button type="button" className="emg-exit" onClick={exit}>Exit</button>
        <div className="emergency-communication">
          <b>Onboard medical help: Crew Medical Officer</b>
          <span>Earth link · {delay < 0.05 ? 'seconds' : formatDelay(delay)} one way · {delay < 0.05 ? 'seconds' : formatDelay(delay * 2)} round trip</span>
        </div>
      </header>
      <main className="emg-body">
        {view === 'choose' && <>
          <h1 ref={heading} id="emergency-title" tabIndex={-1}>{unfinished ? 'Resume the unfinished case?' : 'What is happening?'}</h1>
          {unfinished ? <>
            <p className="emergency-detail">{unfinished.execution.title} · started {new Date(unfinished.execution.startedAt!).toLocaleString('en-GB')}. Timers continue from their recorded start.</p>
            <div className="emg-answers">
              <button type="button" onClick={() => resume(unfinished)}>Resume last step</button>
              <button type="button" onClick={() => { setActiveId(unfinished.execution.id); setView('replace'); }}>Start a new case</button>
            </div>
          </> : <div className="emg-answers">{protocols.map(p => <button key={p.id} type="button" onClick={() => start(p.id)}>{p.name}</button>)}</div>}
          {journal.sessions.length > 0 && <button type="button" className="emergency-secondary" onClick={() => setView('records')}>View case records ({journal.sessions.length})</button>}
        </>}

        {view === 'care' && session && step && <>
          <p className="emergency-progress">Step {session.visits.length} · {session.environment.name}</p>
          <h1 ref={heading} id="emergency-title" tabIndex={-1}>{step.action.text}</h1>
          <p className="emergency-detail">{step.detail}</p>
          <StepTimer session={session} now={now} />
          <div className="emg-answers">{step.answers.map((choice, index) => <button type="button" key={`${session.visits.length}-${choice.label}`} onClick={event => { if (event.detail <= 1) answer(index, session.visits.length - 1); }}>{choice.label}</button>)}</div>
          {assessment && <EscalationPanel assessment={assessment} plan={assessment.plan} receipts={session.notifications} now={now} onConfirm={recordContact} />}
          <details className="emergency-clinical-context">
            <summary>{assessment ? `Linked readings: ${assessment.subject.name}${readingsChanged ? ' · newer readings available' : ''}` : 'No readings linked to this patient'}</summary>
            {!assessment ? <>
              <p>Available readings belong to {crew.name}. Link them only if this person is receiving care.</p>
              <button type="button" className="emergency-secondary" onClick={linkReadings}>Link {crew.name}’s readings to this patient</button>
            </> : <>
              <p>Snapshot captured {new Date(assessment.capturedAt).toLocaleString('en-GB')}. Measurements provide context; they do not choose an emergency response.</p>
              <ReadingSnapshot assessment={assessment} />
              {readingsChanged && <p role="status">New readings are available. Updating records a new assessment and its engine plan; previous assessments remain in the handover record.</p>}
              <button type="button" className="emergency-secondary" disabled={!readingsChanged} onClick={linkReadings}>Update from latest readings</button>
            </>}
          </details>
          <Sources step={step} />
          <details className="emergency-records"><summary>Steps recorded ({session.visits.filter(v => v.answer !== null).length})</summary><VisitLog session={session} /></details>
        </>}

        {view === 'leave' && <>
          <h1 ref={heading} id="emergency-title" tabIndex={-1}>Leave emergency mode?</h1>
          <p className="emergency-detail">{journal.persistence === 'device' ? 'The case stays unfinished. Reopen Emergency to resume the same step and timer.' : 'This case is session-only. Download its record before leaving; reloading will lose it.'}</p>
          <div className="emg-answers"><button type="button" onClick={() => setView('care')}>Continue care</button><button type="button" onClick={() => { if (journal.persistence === 'session') exportRecord(); setEmergency(false); }}>{journal.persistence === 'device' ? 'Keep record and exit' : 'Download record and exit'}</button></div>
        </>}

        {view === 'replace' && session && <>
          <h1 ref={heading} id="emergency-title" tabIndex={-1}>End this record before starting another?</h1>
          <p className="emergency-detail">The unfinished case remains in your records as ended early. This does not mark any unconfirmed step as done.</p>
          <div className="emg-answers"><button type="button" onClick={() => setView('care')}>Resume care</button><button type="button" onClick={() => { emergencyJournal.save(abortCase(session, new Date().toISOString())); setActiveId(null); setView('choose'); }}>End record</button></div>
        </>}

        {view === 'summary' && session && <>
          <h1 ref={heading} id="emergency-title" tabIndex={-1}>{session.execution.status === 'completed' ? 'Handover recorded.' : 'Record ended early.'}</h1>
          <p className="emergency-detail">{session.execution.title} · {session.visits.filter(v => v.answer !== null).length} steps confirmed. This records your responses; it does not confirm that care is complete.</p>
          <div className="emg-answers"><button type="button" onClick={exportRecord}>Download handover record</button><button type="button" onClick={() => setEmergency(false)}>Back to console</button></div>
          {downloaded && <p role="status">Text file prepared. No message has been sent.</p>}
          {assessment && <><EscalationPanel assessment={assessment} plan={assessment.plan} receipts={session.notifications} now={session.endedAt ? Date.parse(session.endedAt) : now} /><details className="emergency-clinical-context"><summary>Linked readings: {assessment.subject.name}</summary><ReadingSnapshot assessment={assessment} /></details></>}
          <VisitLog session={session} />
          <button type="button" className="emergency-secondary" onClick={() => { setActiveId(null); setView('choose'); }}>Choose another case</button>
        </>}

        {view === 'records' && <>
          <h1 ref={heading} id="emergency-title" tabIndex={-1}>Case records on this device.</h1>
          <ul className="emergency-case-list">{[...journal.sessions].reverse().map(record => <li key={record.execution.id}><button type="button" onClick={() => resume(record)}><b>{record.execution.title}</b><span>{new Date(record.execution.startedAt!).toLocaleString('en-GB')} · {record.execution.status === 'completed' ? 'Handover recorded' : record.execution.status === 'aborted' ? 'Ended early' : 'Unfinished'}</span></button></li>)}</ul>
          <button type="button" className="emergency-secondary" onClick={() => { setActiveId(null); setView('choose'); }}>Back to cases</button>
        </>}
      </main>
      <footer className="emg-foot">
        <p>Earth reply delay: {delay < 0.05 ? 'seconds' : formatDelay(delay * 2)} round trip (scenario). Act on board first.</p>
        <p className={journal.persistence === 'session' ? 'emergency-storage-warning' : ''} role={journal.persistence === 'session' ? 'status' : undefined}>
          {journal.persistence === 'device' ? 'Records saved on this device.' : journal.problem === 'unreadable' ? 'Existing records cannot be read. New records are session-only; download before leaving.' : 'Device storage unavailable. Records are session-only; download before leaving.'}
        </p>
        <p>Training prototype · onboard adaptation · clinical review pending.</p>
      </footer>
    </div>
  );
}
