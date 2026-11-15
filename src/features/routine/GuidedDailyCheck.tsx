import { useState, type ReactNode } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { indicators, type IndicatorId } from '../../data/indicators';
import { requiredCheck as required, optionalCheck, checkSequence as guidedCheckOrder, checkInfo, checkProgress } from './checkSequence';
import { useAssessment } from '../../store/derived';
import { useMission } from '../../store/mission';
import { guides } from '../../data/guides';
import { InlineGuide } from '../guides/InlineGuide';
import { RecordPanel } from '../measurements/RecordPanel';

export function GuidedDailyCheck({ children }: { children?: ReactNode }) {
  const { latest, score } = useAssessment();
  const open = useMission((s) => s.open);
  const [entryFor, setEntryFor] = useState<IndicatorId | null>(null);
  const [skipped, setSkipped] = useState<IndicatorId[]>([]);
  const [chosen, setChosen] = useState<IndicatorId | null>(null);
  const [lastSaved, setLastSaved] = useState<IndicatorId | null>(null);
  const done = (id: IndicatorId) => !!latest[id] && latest[id]?.source !== 'simulator';
  const { required: ready, optional: optionalReady } = checkProgress(latest);
  const next = chosen ?? guidedCheckOrder.find((id) => !done(id) && !skipped.includes(id));
  return (
    <section className="guided-check" aria-label="Guided daily check">
      <div className="guided-check-aside">
      <header className="guided-check-head">
        <span className="micro">{ready < required.length ? 'First · early warning' : 'Next · daily routine'}</span>
        <h3>{ready < required.length ? '7 observations, one risk score.' : next ? 'Your early warning is ready.' : 'Required check complete.'}</h3>
        <p>{ready < required.length ? 'This count tracks saved observations, not risk points. NEWS2 adds the seven inputs into a score from 0 to 20.' : 'Your seven required observations are saved. Glucose, sleep and mood are additional routine readings.'}</p>
      </header>
      <div className="guided-check-progress">
        <span><strong>{ready}/{required.length}</strong> NEWS2 observations recorded by you</span>
        <progress value={ready} max={required.length} aria-label="NEWS2 observations recorded" />
      </div>
      <div className="guided-check-sequence" role="group" aria-label="Required observations">
        {required.map((id, index) => <button key={id} type="button" aria-label={`${indicators[id].name}${done(id) ? ', recorded' : ', pending'}`} aria-current={next === id ? 'step' : undefined} title={indicators[id].name} onClick={() => { setChosen(id); setEntryFor(null); }}>
          {done(id) ? <Check size={12} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}
          <span>{checkInfo[id]?.name ?? indicators[id].short}</span>
        </button>)}
      </div>
      {lastSaved && <p className="guided-check-saved" role="status"><Check size={12} aria-hidden="true" /> {indicators[lastSaved].name} saved on this device.</p>}
      <div className="check-score-summary">
        <span className="micro">NEWS2 risk score</span>
        <strong>{score.complete ? score.total : '—'} <small>/ 20 points</small></strong>
        <span>{score.complete ? `${score.risk} risk${required.some((id) => latest[id]?.source === 'simulator') ? ' · includes simulation' : ''}` : 'Available after all seven observations.'}</span>
      </div>
      <span className="check-optional-count">Optional routine · {optionalReady}/{optionalCheck.length} recorded</span>
      {children}
      </div>
      {next ? <div className="guided-check-current">
        <span className="micro">{required.includes(next) ? `Observation ${required.indexOf(next) + 1} / ${required.length}` : 'Optional routine reading'}</span>
        <h3>{checkInfo[next]?.name ?? indicators[next].name}</h3>
        <p className="check-current-hint">{checkInfo[next]?.hint}</p>
        <ol className="check-entry-phases" aria-label="Current observation steps">
          <li aria-current={entryFor !== next ? 'step' : undefined}>1 · Measure</li>
          <li aria-current={entryFor === next ? 'step' : undefined}>2 · Enter & preview</li>
          <li>3 · Save & next</li>
        </ol>
        {entryFor === next ? <>
          <RecordPanel key={next} initialId={next} guided onSaved={() => { setLastSaved(next); setChosen(null); setEntryFor(null); }} />
          <button type="button" className="btn btn-ghost check-back-guide" onClick={() => setEntryFor(null)}>Back to measurement guide</button>
        </> : <div className="check-measure-step">
          {guides[next] ? <InlineGuide key={next} id={next} /> : <p>{checkInfo[next]?.hint}</p>}
          <button type="button" className="btn btn-solid" onClick={() => setEntryFor(next)}>I have my reading · enter value <ArrowRight size={14} aria-hidden="true" /></button>
        </div>}
        {!required.includes(next) && <button type="button" className="btn btn-ghost" onClick={() => { setSkipped((current) => [...current, next]); setChosen(null); }}>Skip this optional reading for now</button>}
      </div> : <div className="guided-check-finish">
        <p>{skipped.length ? `${skipped.length} optional readings deferred; they remain pending in your routine.` : 'All daily readings recorded on this device.'}</p>
        {score.complete && <button className="btn btn-solid" type="button" onClick={() => open('news')}>View early warning assessment <ArrowRight size={14} aria-hidden="true" /></button>}
      </div>}
    </section>
  );
}
