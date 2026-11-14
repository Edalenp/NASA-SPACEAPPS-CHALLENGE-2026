import { ArrowUpRight } from 'lucide-react';
import { systems } from '../../data/mission';
import { indicators, formatValue } from '../../data/indicators';
import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { deviation } from '../../engine/status';
import { StateChip } from '../../ui/StateMark';
import { BaselineRuler } from '../../ui/BaselineRuler';

export function Inspector() {
  const { states, readings, score } = useAssessment();
  const selected = useMission((s) => s.selected);
  const open = useMission((s) => s.open);
  const entries = useMission((s) => s.entries);
  const sys = systems.find((s) => s.id === selected)!;
  const state = states[sys.id];
  // Headline the worst reading of the system; the first one when all are fine.
  const order = { alert: 3, watch: 2, normal: 1, missing: 0 } as const;
  const focus = sys.readings.reduce((best, r) => (order[deviation(r, readings[r]).status] > order[deviation(best, readings[best]).status] ? r : best), sys.readings[0]);
  const ind = indicators[focus];
  const dev = deviation(focus, readings[focus]);
  const lastEntry = [...entries].reverse().find((e) => e.indicator === focus);
  const measured = lastEntry
    ? `Recorded ${new Date(lastEntry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} / this device`
    : readings[focus] === null ? 'Not measured today' : 'Last measured 08:30 / simulated';

  return (
    <section className="inspector" aria-live="polite" aria-label={`${sys.name} details`}>
      <div className="inspector-top">
        <span className="micro">Sys.{sys.code} / Inspection</span>
        <StateChip status={state} />
      </div>
      <h2 key={sys.id} className="inspector-title">{sys.name}</h2>
      <button type="button" className="link-row" onClick={() => open('system')}>
        <span className="micro">NASA HRP risk</span>
        <span>{sys.hrpRisk} <ArrowUpRight size={12} aria-hidden="true" /></span>
      </button>

      <div className="readout">
        <span className="micro">{ind.name}</span>
        <div className="readout-figure">
          <strong>{formatValue(focus, readings[focus])}</strong>
          {ind.kind === 'number' && readings[focus] !== null && <span>{ind.unit}</span>}
          <span className={`readout-delta is-${dev.status}`}>{dev.text}</span>
        </div>
        <span className="micro readout-time">{ind.kind === 'number' && ind.usual ? `Usual ${ind.usual[0]}–${ind.usual[1]} ${ind.unit} · ` : ''}{measured}</span>
      </div>

      {sys.readings.length > 1 && (
      <div className="rulers">
        {sys.readings.filter((r) => r !== focus).map((r) => (
          <BaselineRuler key={r} id={r} value={readings[r]} onClick={() => open('record', { recordFor: r })} />
        ))}
      </div>
      )}

      {state === 'watch' || state === 'alert' ? (
        <div className="todo">
          <h3>What to do now</h3>
          <ol>
            <li>Rest seated for 5 minutes, then measure again.</li>
            <li>{score.escalation === 'self' ? 'Repeat the full check in 4 hours.' : 'Repeat the full check every hour.'}</li>
            <li>{score.escalation === 'self' ? 'If the score reaches 5, or you feel faint, tell the Crew Medical Officer.' : 'Tell the Crew Medical Officer now.'}</li>
          </ol>
        </div>
      ) : (
        <p className={`note is-${state}`}>
          {state === 'missing' ? 'No reading yet today. Complete your daily check-in.' : 'Within your usual range. Nothing to do now.'}
        </p>
      )}

      <div className="inspector-actions">
        <button type="button" className="btn btn-solid" onClick={() => open('record', { recordFor: focus })}>Measure again</button>
        <button type="button" className="btn btn-outline" onClick={() => open('guides', { guide: focus })}>How to measure</button>
      </div>
    </section>
  );
}
