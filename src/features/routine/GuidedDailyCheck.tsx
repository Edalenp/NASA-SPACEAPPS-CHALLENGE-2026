import { useState, type CSSProperties, type ReactNode } from 'react';
import { Check, ArrowRight, SkipForward, X } from 'lucide-react';
import { indicators, type IndicatorId } from '../../data/indicators';
import { requiredCheck as required, optionalCheck, checkSequence as guidedCheckOrder, checkInfo, checkProgress } from './checkSequence';
import { useAssessment } from '../../store/derived';
import { useMission } from '../../store/mission';
import { guides } from '../../data/guides';
import { InlineGuide } from '../guides/InlineGuide';
import { RecordPanel } from '../measurements/RecordPanel';
import { clinicalBreaches } from '../dashboard/cause';
import { useHabitatMotion, useReducedMotion } from '../twin/environments/motion';

type View = 'check' | 'readings' | 'rest';

/** The check on the left; the right pane holds the current step, every reading, or rest planning. */
export function GuidedDailyCheck({ readings, rest }: { readings: ReactNode; rest: ReactNode }) {
  const { latest, score, readings: values } = useAssessment();
  const breaches = clinicalBreaches(values);
  const playing = useHabitatMotion((s) => s.playing);
  const reduced = useReducedMotion();
  const still = !playing || reduced;
  const open = useMission((s) => s.open);
  // Update mode: every reading in turn, each saved one ticked off for this round.
  const updating = useMission((s) => s.routineUpdate);
  const [updated, setUpdated] = useState<IndicatorId[]>([]);
  const [entryFor, setEntryFor] = useState<IndicatorId | null>(null);
  const [skipped, setSkipped] = useState<IndicatorId[]>([]);
  const [chosen, setChosen] = useState<IndicatorId | null>(null);
  const [lastSaved, setLastSaved] = useState<IndicatorId | null>(null);
  const [view, setView] = useState<View>('check');
  const done = (id: IndicatorId) => !!latest[id];
  const isSimulated = (id: IndicatorId) => latest[id]?.source === 'simulator';
  const { required: ready, optional: optionalReady, simulated: simulatedCount, simulatedOptional } = checkProgress(latest);
  const pending = (id: IndicatorId) => (updating ? !updated.includes(id) : !done(id)) && !skipped.includes(id);
  const next = chosen ?? guidedCheckOrder.find(pending);
  const step = next ? guidedCheckOrder.indexOf(next) + 1 : guidedCheckOrder.length;
  // With nothing left to measure, "Today" lists the day's readings, so the pane never stands empty.
  const current: View = !next && view === 'readings' ? 'check' : view;
  const pane: View = current === 'check' && !next ? 'readings' : current;
  const views: readonly (readonly [View, string])[] = next
    ? [['check', 'Guided check'], ['readings', 'All readings'], ['rest', 'Plan rest']]
    : [['check', 'Today'], ['rest', 'Plan rest']];
  const simulated = required.some((id) => latest[id]?.source === 'simulator');
  // The marker on the current step beats at the recorded heart rate, like the deck under the body.
  const bpm = typeof values.pulse === 'number' && values.pulse > 0 ? values.pulse : 72;
  const beat = { '--beat': `${(60 / bpm).toFixed(3)}s` } as CSSProperties;

  return (
    <section className={`guided-check ${still ? 'is-still' : ''}`} style={beat} aria-label="Guided daily check">
      <div className="guided-check-aside">
        <header className="guided-check-head">
          <span className="micro">{updating ? `Update · step ${step} of ${guidedCheckOrder.length}` : ready < required.length ? 'First · early warning' : 'Next · daily routine'}</span>
          <h3>{updating ? (next ? 'Bring every reading up to date.' : 'All readings reviewed.') : ready < required.length ? '7 observations, one risk score.' : next ? 'Your early warning is ready.' : 'Required check complete.'}</h3>
          <p>
            {updating
              ? 'One reading at a time, in the order of the check. Measure and save it, or keep today’s value and move on. Close at any step: what you saved stays saved.'
              : ready < required.length
              ? 'This count tracks saved observations, not risk points. NEWS2 adds the seven inputs into a score from 0 to 20.'
              : simulatedCount + simulatedOptional
                ? 'All seven observations are in, some from the mission simulation. Measure them yourself to replace the simulated ones.'
                : 'Your seven required observations are saved. Glucose, sleep and mood are additional routine readings.'}
          </p>
        </header>
        <div className="guided-check-progress">
          <div className="check-row"><span className="micro">NEWS2 observations{simulatedCount ? ` · ${simulatedCount} simulated` : ''}</span><strong>{ready}/{required.length}</strong></div>
          <progress value={ready} max={required.length} aria-label="NEWS2 observations recorded" />
        </div>
        <div className="guided-check-sequence" role="group" aria-label="Required observations">
          {required.map((id, index) => (
            <button
              key={id}
              type="button"
              className={updating && updated.includes(id) ? 'is-updated' : undefined}
              aria-label={`${indicators[id].name}${done(id) ? (isSimulated(id) ? ', simulated reading' : ', recorded') : ', pending'}`}
              aria-current={next === id ? 'step' : undefined}
              data-simulated={isSimulated(id) || undefined}
              title={isSimulated(id) ? `${indicators[id].name} · simulation` : indicators[id].name}
              onClick={() => { setChosen(id); setEntryFor(null); setView('check'); }}
            >
              {(updating ? updated.includes(id) : done(id)) ? <Check size={12} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}
              <span>{indicators[id].name}</span>
            </button>
          ))}
        </div>
        <div className="check-row check-optional-count"><span>Optional routine readings{simulatedOptional ? ` · ${simulatedOptional} simulated` : ''}</span><strong>{optionalReady}/{optionalCheck.length}</strong></div>
        {lastSaved && <p className="guided-check-saved" role="status"><Check size={12} aria-hidden="true" /> {indicators[lastSaved].name} saved on this device.</p>}
        <div className="check-score-summary">
          <span className="micro">NEWS2 risk score</span>
          <strong>{score.complete ? score.total : '—'} <small>/ 20 points</small></strong>
          <span>{score.complete ? `NEWS2 ${score.risk.toLowerCase()} risk${breaches.length ? ` · clinical ${breaches[0].severity}` : ''}${simulated ? ' · includes simulation' : ''}` : 'After all seven observations.'}</span>
        </div>
      </div>

      <div className="guided-check-main">
        <div className="segmented routine-views" role="group" aria-label="Routine view">
          {views.map(([id, label]) => (
            <button key={id} type="button" className={current === id ? 'is-on' : ''} aria-pressed={current === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        {pane === 'readings' && (
          <div className="routine-pane">
            {!next && (
              <div className="guided-check-finish">
                <p>{skipped.length ? `${skipped.length} optional readings deferred; they remain pending in your routine.` : 'All daily readings recorded on this device.'}</p>
                {score.complete && <button className="btn btn-solid" type="button" onClick={() => open('news')}>View early warning assessment <ArrowRight size={14} aria-hidden="true" /></button>}
              </div>
            )}
            {readings}
          </div>
        )}
        {pane === 'rest' && <div className="routine-pane">{rest}</div>}
        {pane === 'check' && next && (
          <div className="guided-check-current">
            <span className="micro">{required.includes(next) ? `Observation ${required.indexOf(next) + 1} / ${required.length}` : 'Optional routine reading'}</span>
            <h3>{indicators[next].name}</h3>
            <p className="check-current-hint">{checkInfo[next]?.hint}</p>
            <ol className="check-entry-phases" aria-label="Current observation steps">
              <li aria-current={entryFor !== next ? 'step' : undefined}>
                {entryFor === next ? <button type="button" title="Back to the measurement guide" onClick={() => setEntryFor(null)}>1 · Measure</button> : '1 · Measure'}
              </li>
              <li aria-current={entryFor === next ? 'step' : undefined}>2 · Enter & preview</li>
              <li>3 · Save & next</li>
            </ol>
            {entryFor === next ? (
              <RecordPanel key={next} initialId={next} guided onSaved={() => { setLastSaved(next); setUpdated((list) => [...list, next]); setChosen(null); setEntryFor(null); }} />
            ) : (
              <div className="check-measure-step">
                {guides[next] ? <InlineGuide key={next} id={next} /> : <p>{checkInfo[next]?.hint}</p>}
                <button type="button" className="btn btn-solid" onClick={() => setEntryFor(next)}>I have my reading · enter value <ArrowRight size={14} aria-hidden="true" /></button>
              </div>
            )}
            {updating && done(next) ? (
              <button type="button" className="btn btn-ghost" onClick={() => { setSkipped((list) => [...list, next]); setChosen(null); setEntryFor(null); }}><SkipForward size={14} aria-hidden="true" /> Keep today’s reading · next</button>
            ) : !required.includes(next) && <button type="button" className="btn btn-ghost" onClick={() => { setSkipped((list) => [...list, next]); setChosen(null); }}><SkipForward size={14} aria-hidden="true" /> Skip this optional reading for now</button>}
            {updating && <button type="button" className="btn btn-ghost" onClick={() => open(null)}><X size={14} aria-hidden="true" /> Finish for now</button>}
          </div>
        )}
      </div>
    </section>
  );
}
