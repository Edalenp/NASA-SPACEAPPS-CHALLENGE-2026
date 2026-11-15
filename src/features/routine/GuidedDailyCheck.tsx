import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { dailyCheck, indicators, type IndicatorId } from '../../data/indicators';
import { newsParameters } from '../measurements/adapter';
import { useAssessment } from '../../store/derived';
import { useMission } from '../../store/mission';
import { RecordPanel } from '../measurements/RecordPanel';

const required: readonly IndicatorId[] = [
  ...dailyCheck.filter((id) => (newsParameters as readonly IndicatorId[]).includes(id)),
  ...newsParameters.filter((id) => !dailyCheck.includes(id)),
];
/** First complete NEWS2, then offer the remaining daily measurements. No engine rules change. */
const guidedCheckOrder: IndicatorId[] = [...required, ...dailyCheck.filter((id) => !required.includes(id))];

export function GuidedDailyCheck() {
  const { latest, score } = useAssessment();
  const open = useMission((s) => s.open);
  const [skipped, setSkipped] = useState<IndicatorId[]>([]);
  const [chosen, setChosen] = useState<IndicatorId | null>(null);
  const [lastSaved, setLastSaved] = useState<IndicatorId | null>(null);
  const done = (id: IndicatorId) => !!latest[id] && latest[id]?.source !== 'simulator';
  const ready = required.filter(done).length;
  const next = chosen ?? guidedCheckOrder.find((id) => !done(id) && !skipped.includes(id));
  return (
    <section className="guided-check" aria-label="Guided daily check">
      <header className="guided-check-head">
        <span className="micro">{ready < required.length ? 'First · early warning' : 'Next · daily routine'}</span>
        <h3>{ready < required.length ? 'One observation at a time.' : next ? 'Your early warning is ready.' : 'Required check complete.'}</h3>
        <p>{ready < required.length ? 'Measure each value, preview it here, then save. We will take you to the next observation. You can also record from any system card; it all updates the same check.' : 'Your seven NEWS2 observations are recorded. The remaining readings complete your daily routine.'}</p>
      </header>
      <div className="guided-check-progress">
        <span><strong>{ready}/{required.length}</strong> NEWS2 observations recorded by you</span>
        <progress value={ready} max={required.length} aria-label="NEWS2 observations recorded" />
      </div>
      <div className="guided-check-sequence" role="group" aria-label="Required observations">
        {required.map((id, index) => <button key={id} type="button" aria-label={`${indicators[id].name}${done(id) ? ', recorded' : ', pending'}`} aria-current={next === id ? 'step' : undefined} title={indicators[id].name} onClick={() => setChosen(id)}>
          {done(id) ? <Check size={12} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}
          <span>{indicators[id].short}</span>
        </button>)}
      </div>
      {lastSaved && <p className="guided-check-saved" role="status"><Check size={12} aria-hidden="true" /> {indicators[lastSaved].name} saved on this device.</p>}
      {next ? <div className="guided-check-current">
        <span className="micro">{required.includes(next) ? 'Required for NEWS2' : 'Optional daily reading'}</span>
        <RecordPanel key={next} initialId={next} guided onSaved={() => { setLastSaved(next); setChosen(null); }} />
        {!required.includes(next) && <button type="button" className="btn btn-ghost" onClick={() => { setSkipped((current) => [...current, next]); setChosen(null); }}>Skip this optional reading for now</button>}
      </div> : <div className="guided-check-finish">
        <p>{skipped.length ? `${skipped.length} optional readings deferred; they remain pending in your routine.` : 'All daily readings recorded on this device.'}</p>
        {score.complete && <button className="btn btn-solid" type="button" onClick={() => open('news')}>View early warning assessment <ArrowRight size={14} aria-hidden="true" /></button>}
      </div>}
    </section>
  );
}
