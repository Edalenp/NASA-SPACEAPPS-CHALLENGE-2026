/** Full-screen emergency guidance. No changes to X's store, app shell or shared styles. */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from 'react';
import { ArrowLeft, ClipboardList, Download, Link, List, LogOut, Play, Plus, RefreshCw, Square, type LucideIcon } from 'lucide-react';
import { Lockup } from '../../ui/Logo';
import { protocols, type Step } from '../../data/protocols';
import { crew, environments, formatDelay } from '../../data/mission';
import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { emergencyJournal } from './journal';
import { abortCase, answerCase, attachAssessment, beginCase, confirmContact, currentStep, emergencyReport, formatElapsed, stepSeconds, type EmergencySession } from './workflow';
import { assessEmergencyReadings, consoleEvidence, evidenceSignature, toEngineEnvironment } from './assessment';
import { EscalationPanel, ReadingSnapshot } from './EscalationPanel';
import type { ContactRole } from '../../engine/escalation';
import './emergency.css';

type View = 'choose' | 'care' | 'summary' | 'records' | 'leave' | 'replace';
const VisualGuides = lazy(() => import('../guides/VisualGuidesPanel'));
const CareArt = lazy(() => import('../guides/art/care').then(m => ({ default: m.CareArt })));
/** Steps with a drawing; kept here so the drawings stay out of the main bundle. */
const CARE_ART = new Set(['call', 'stop', 'symptoms', 'respond', 'breathing', 'airway', 'monitor', 'cpr', 'handover']);
const hasCareArt = (id: string) => CARE_ART.has(id);

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
    <ul className="emergency-sources">
      {step.sources.map(source => (
        <li key={source.url}>
          <b>{source.title}</b>
          <p>{source.note}</p>
          <p className="emergency-source-meta">Reference checked {source.checkedAt}. Summary available offline.</p>
          <a href={source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
        </li>
      ))}
    </ul>
  );
}

type SupportTab = 'sources' | 'readings' | 'steps' | 'visuals';
const supportTabs: { id: SupportTab; label: string }[] = [
  { id: 'sources', label: 'Source' },
  { id: 'readings', label: 'Readings' },
  { id: 'steps', label: 'Steps' },
  { id: 'visuals', label: 'How to measure' },
];

function StepTimer({ session, now }: { session: EmergencySession; now: number }) {
  const step = currentStep(session);
  if (!step?.timer) return null;
  const { elapsed, remaining } = stepSeconds(session, now);
  return (
    <div className="emergency-step-timer">
      <span>{step.timer.label}</span>
      <strong role="timer" aria-live="off" aria-label={remaining === null ? 'Time on this step' : 'Time remaining for this check'}>
        {formatClock(remaining ?? elapsed)}
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


/** A running clock: mm:ss, and h:mm:ss once it passes an hour (191:03 reads as 3:11:03). */
function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 3600) return formatElapsed(safe);
  return `${Math.floor(safe / 3600)}:${formatElapsed(safe % 3600)}`;
}

/** Hours and minutes once a case runs past an hour; mm:ss before that. */
function formatSpan(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 3600) return formatElapsed(safe);
  return `${Math.floor(safe / 3600)} h ${String(Math.floor((safe % 3600) / 60)).padStart(2, '0')} min`;
}

/** The screen's statement: an alert aura holding the question, its context and the case figures. */
function Hero({ kicker, title, detail, heading, children }: { kicker: string; title: string; detail?: ReactNode; heading: Ref<HTMLHeadingElement>; children?: ReactNode }) {
  return (
    <section className="emg-hero aura is-alert">
      <span className="micro">{kicker}</span>
      <h1 ref={heading} id="emergency-title" tabIndex={-1}>{title}</h1>
      {detail && <p className="emg-hero-detail">{detail}</p>}
      {children}
    </section>
  );
}

function Figure({ value, label }: { value: ReactNode; label: string }) {
  return <div className="emg-figure"><strong>{value}</strong><span>{label}</span></div>;
}

/** One action as a flat tile: icon, what it does, and what follows from it. */
function ActionTile({ icon: Icon, label, note, primary = false, onClick }: { icon: LucideIcon; label: string; note?: string; primary?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`emg-tile ${primary ? 'is-primary' : ''}`} onClick={onClick}>
      <Icon size={22} aria-hidden="true" />
      <span><b>{label}</b>{note && <small>{note}</small>}</span>
    </button>
  );
}

/**
 * What has been recorded, at a glance: a strip whose segments are the time spent on each step
 * (the current one in alert), and the steps below with their answers and when they began.
 */
function CaseTimeline({ session, now }: { session: EmergencySession; now: number }) {
  const start = Date.parse(session.execution.startedAt!);
  const end = session.endedAt ? Date.parse(session.endedAt) : now;
  const total = Math.max(1, end - start);
  const spans = session.visits.map((visit, index) => ({
    index,
    visit,
    action: session.execution.steps[index].action,
    from: Date.parse(visit.enteredAt),
    to: index + 1 < session.visits.length ? Date.parse(session.visits[index + 1].enteredAt) : end,
  }));
  const shown = spans.slice(-6);
  const confirmed = session.visits.filter((visit) => visit.answer !== null).length;
  return (
    <figure className="emg-timeline">
      <figcaption>
        <span className="micro">Case timeline</span>
        <span>{confirmed} of {spans.length} steps confirmed · {formatSpan(total / 1000)}</span>
      </figcaption>
      <div className="emg-timeline-bar" aria-hidden="true">
        {spans.map((span) => (
          <span key={span.index} className={span.visit.answer ? 'is-done' : 'is-current'} style={{ flexGrow: Math.max(span.to - span.from, total * 0.03) }}>
            {String(span.index + 1).padStart(2, '0')}
          </span>
        ))}
      </div>
      <ol className="emg-timeline-steps" style={{ gridTemplateColumns: `repeat(${Math.max(shown.length, 3)}, minmax(0, 1fr))` }}>
        {shown.map((span) => (
          <li key={span.index} className={span.visit.answer ? 'is-done' : 'is-current'}>
            <span className="emg-timeline-index">{String(span.index + 1).padStart(2, '0')} · +{formatSpan((span.from - start) / 1000)}</span>
            <b>{span.action.text}</b>
            <span>{span.visit.answer ?? 'In progress'}</span>
          </li>
        ))}
      </ol>
      {spans.length > shown.length && <p className="emg-timeline-more">{spans.length - shown.length} earlier steps in the strip above and in the handover record.</p>}
    </figure>
  );
}

export function Emergency() {
  const setEmergency = useMission(s => s.setEmergency);
  const environmentId = useMission(s => s.environment);
  const { readings, latest } = useAssessment();
  const availableEvidence = useMemo(() => consoleEvidence(readings, latest), [readings, latest]);
  const journal = useSyncExternalStore(emergencyJournal.subscribe, emergencyJournal.getSnapshot);
  const unfinished = journal.sessions.findLast(s => s.execution.status === 'inProgress');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>('choose');
  const [downloaded, setDownloaded] = useState(false);
  const [support, setSupport] = useState<SupportTab>('sources');
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const session = journal.sessions.find(s => s.execution.id === activeId);
  const step = session ? currentStep(session) : undefined;
  const assessment = session?.assessments?.at(-1);
  const readingsChanged = assessment && assessment.signature !== evidenceSignature(availableEvidence);
  const running = view === 'care' && session?.execution.status === 'inProgress';
  // The unfinished case's clock keeps running on the resume screen too.
  const now = useNow(running || (view === 'choose' && !!unfinished));
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
    setSupport('sources');
    setView('care');
  }
  function answer(index: number, visitIndex: number) {
    const latest = emergencyJournal.getSnapshot().sessions.find(s => s.execution.id === activeId);
    if (!latest) return;
    const next = answerCase(latest, visitIndex, index, new Date().toISOString());
    if (next === latest) return;
    setSupport(tab => (tab === 'visuals' ? 'sources' : tab));
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
        <span className="emergency-brand">
          <Lockup />
          <span className="emergency-chip aura is-alert">Emergency</span>
          {session && <span className="emergency-case">{session.execution.title}</span>}
        </span>
        {session && <span className="emg-timer" role="timer" aria-live="off" aria-label="Case elapsed time">{formatClock(elapsed)}</span>}
        <button type="button" className="emg-exit btn btn-outline" onClick={exit}><LogOut size={18} aria-hidden="true" /> Exit</button>
        <div className="emergency-communication">
          <b>Onboard medical help: Crew Medical Officer</b>
          <span>Earth link · {delay < 0.05 ? 'seconds' : formatDelay(delay)} one way · {delay < 0.05 ? 'seconds' : formatDelay(delay * 2)} round trip</span>
        </div>
      </header>
      <main className="emg-body">
        {view === 'choose' && (unfinished ? (
          <div className="emg-stage">
            <Hero
              heading={heading}
              kicker="Emergency / unfinished case"
              title="Resume the unfinished case?"
              detail={<>{unfinished.execution.title} · started {new Date(unfinished.execution.startedAt!).toLocaleString('en-GB')} · {unfinished.environment.name}. Timers continue from their recorded start.</>}
            >
              <div className="emg-figures">
                <Figure value={formatSpan((now - Date.parse(unfinished.execution.startedAt!)) / 1000)} label="since the case began" />
                <Figure value={unfinished.visits.filter((visit) => visit.answer !== null).length} label="steps confirmed" />
                <Figure value={String(unfinished.visits.length).padStart(2, '0')} label="current step" />
              </div>
            </Hero>
            <div className="emg-actions">
              <ActionTile primary icon={Play} label="Resume last step" note={currentStep(unfinished)?.action.text} onClick={() => resume(unfinished)} />
              <ActionTile icon={Plus} label="Start a new case" note="This record will be kept as ended early." onClick={() => { setActiveId(unfinished.execution.id); setView('replace'); }} />
              {journal.sessions.length > 0 && <ActionTile icon={ClipboardList} label={`Case records (${journal.sessions.length})`} note="Every case kept on this device." onClick={() => setView('records')} />}
            </div>
            <CaseTimeline session={unfinished} now={now} />
          </div>
        ) : (
          <div className="emg-stage">
            <Hero heading={heading} kicker="Emergency" title="What is happening?" detail="Choose the situation. Each protocol guides one step at a time and records your answers and times." />
            <div className="emg-actions">
              <div className="emg-protocols">
                {protocols.map((p, index) => (
                  <button key={p.id} type="button" className="emg-tile" onClick={() => start(p.id)}>
                    <span className="emg-tile-index">{String(index + 1).padStart(2, '0')}</span>
                    <span><b>{p.name}</b></span>
                  </button>
                ))}
              </div>
              {journal.sessions.length > 0 && <ActionTile icon={ClipboardList} label={`Case records (${journal.sessions.length})`} note="Every case kept on this device." onClick={() => setView('records')} />}
            </div>
          </div>
        ))}

        {view === 'care' && session && step && (
          <div className="emergency-care">
            <div className="emergency-care-main">
              <p className="emergency-progress">Step {session.visits.length} · {session.environment.name}</p>
              <h1 ref={heading} id="emergency-title" tabIndex={-1}>{step.action.text}</h1>
              <p className="emergency-detail">{step.detail}</p>
              <StepTimer session={session} now={now} />
              <div className="emg-answers">{step.answers.map((choice, index) => <button type="button" key={`${session.visits.length}-${choice.label}`} onClick={event => { if (event.detail <= 1) answer(index, session.visits.length - 1); }}>{choice.label}</button>)}</div>
              {assessment && <EscalationPanel assessment={assessment} plan={assessment.plan} receipts={session.notifications} now={now} onConfirm={recordContact} />}
              <CaseTimeline session={session} now={now} />
            </div>
            <aside className="emergency-care-side" aria-label="Step support">
              {hasCareArt(step.id) && (
                <div className="emergency-care-art">
                  <Suspense fallback={null}><CareArt stepId={step.id} visit={session.visits.length} /></Suspense>
                </div>
              )}
              <div className="emergency-support">
                <div className="emergency-support-tabs" role="tablist" aria-label="Step support">
                  {supportTabs.map(tab => (
                    <button key={tab.id} type="button" role="tab" id={`support-tab-${tab.id}`} aria-controls="support-panel" aria-selected={support === tab.id} onClick={() => setSupport(tab.id)}>
                      {tab.label}{tab.id === 'steps' ? ` · ${session.visits.filter(v => v.answer !== null).length}` : ''}{tab.id === 'readings' && readingsChanged ? ' · new' : ''}
                    </button>
                  ))}
                </div>
                <div className="emergency-support-panel" role="tabpanel" id="support-panel" aria-labelledby={`support-tab-${support}`} tabIndex={0}>
                  {support === 'sources' && <Sources step={step} />}
                  {support === 'readings' && (!assessment ? <>
                    <p>No readings linked to this patient. Available readings belong to {crew.name}. Link them only if this person is receiving care.</p>
                    <button type="button" className="emergency-secondary" onClick={linkReadings}><Link size={18} aria-hidden="true" /> Link {crew.name}’s readings to this patient</button>
                  </> : <>
                    <p>Linked readings: {assessment.subject.name}. Snapshot captured {new Date(assessment.capturedAt).toLocaleString('en-GB')}. Measurements provide context; they do not choose an emergency response.</p>
                    <ReadingSnapshot assessment={assessment} />
                    {readingsChanged && <p role="status">New readings are available. Updating records a new assessment and its engine plan; previous assessments remain in the handover record.</p>}
                    <button type="button" className="emergency-secondary" disabled={!readingsChanged} onClick={linkReadings}><RefreshCw size={18} aria-hidden="true" /> Update from latest readings</button>
                  </>)}
                  {support === 'steps' && <VisitLog session={session} />}
                  {support === 'visuals' && <>
                    <p>Routine measurement help. Continue emergency care first.</p>
                    <Suspense fallback={<p role="status">Loading visual guides…</p>}><VisualGuides /></Suspense>
                  </>}
                </div>
              </div>
            </aside>
          </div>
        )}

        {view === 'leave' && (
          <div className="emg-stage">
            <Hero heading={heading} kicker="Emergency / leave" title="Leave emergency mode?" detail={journal.persistence === 'device' ? 'The case stays unfinished. Reopen Emergency to resume the same step and timer.' : 'This case is session-only. Download its record before leaving; reloading will lose it.'} />
            <div className="emg-actions">
              <ActionTile primary icon={Play} label="Continue care" note={step?.action.text} onClick={() => setView('care')} />
              <ActionTile icon={journal.persistence === 'device' ? LogOut : Download} label={journal.persistence === 'device' ? 'Keep record and exit' : 'Download record and exit'} onClick={() => { if (journal.persistence === 'session') exportRecord(); setEmergency(false); }} />
            </div>
          </div>
        )}

        {view === 'replace' && session && (
          <div className="emg-stage">
            <Hero heading={heading} kicker="Emergency / new case" title="End this record before starting another?" detail="The unfinished case remains in your records as ended early. This does not mark any unconfirmed step as done." />
            <div className="emg-actions">
              <ActionTile primary icon={Play} label="Resume care" note={step?.action.text} onClick={() => setView('care')} />
              <ActionTile icon={Square} label="End record" note="Kept as ended early." onClick={() => { emergencyJournal.save(abortCase(session, new Date().toISOString())); setActiveId(null); setView('choose'); }} />
            </div>
            <CaseTimeline session={session} now={now} />
          </div>
        )}

        {view === 'summary' && session && (
          <div className="emg-stage">
            <Hero
              heading={heading}
              kicker="Emergency / handover"
              title={session.execution.status === 'completed' ? 'Handover recorded.' : 'Record ended early.'}
              detail={<>{session.execution.title} · {session.visits.filter(v => v.answer !== null).length} steps confirmed. This records your responses; it does not confirm that care is complete.</>}
            >
              <div className="emg-figures">
                <Figure value={formatSpan(elapsed)} label="case duration" />
                <Figure value={session.visits.filter(v => v.answer !== null).length} label="steps confirmed" />
              </div>
            </Hero>
            <div className="emg-actions">
              <ActionTile primary icon={Download} label="Download handover record" note={downloaded ? 'Text file prepared. No message has been sent.' : 'A text file with every step, answer and time.'} onClick={exportRecord} />
              <ActionTile icon={ArrowLeft} label="Back to console" onClick={() => setEmergency(false)} />
              <ActionTile icon={List} label="Choose another case" onClick={() => { setActiveId(null); setView('choose'); }} />
              {downloaded && <p className="sr-only" role="status">Text file prepared. No message has been sent.</p>}
            </div>
            <CaseTimeline session={session} now={now} />
            {assessment && <div className="emg-stage-wide">
              <EscalationPanel assessment={assessment} plan={assessment.plan} receipts={session.notifications} now={session.endedAt ? Date.parse(session.endedAt) : now} />
              <details className="emergency-clinical-context"><summary>Linked readings: {assessment.subject.name}</summary><ReadingSnapshot assessment={assessment} /></details>
            </div>}
            <details className="emergency-clinical-context emg-stage-wide"><summary>Step log with sources</summary><VisitLog session={session} /></details>
          </div>
        )}

        {view === 'records' && (
          <div className="emg-stage">
            <Hero heading={heading} kicker="Emergency / records" title="Case records on this device." detail={`${journal.sessions.length} ${journal.sessions.length === 1 ? 'case' : 'cases'}. Open one to resume it or read its handover.`} />
            <div className="emg-actions">
              <ul className="emergency-case-list">{[...journal.sessions].reverse().map(record => <li key={record.execution.id}><button type="button" onClick={() => resume(record)}><b>{record.execution.title}</b><span>{new Date(record.execution.startedAt!).toLocaleString('en-GB')} · {record.execution.status === 'completed' ? 'Handover recorded' : record.execution.status === 'aborted' ? 'Ended early' : 'Unfinished'}</span></button></li>)}</ul>
              <ActionTile icon={ArrowLeft} label="Back to cases" onClick={() => { setActiveId(null); setView('choose'); }} />
            </div>
          </div>
        )}
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
