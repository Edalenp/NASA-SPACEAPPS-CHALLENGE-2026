import { ArrowUpRight } from 'lucide-react';
import { systems, environments } from '../../data/mission';
import { indicators, formatValue } from '../../data/indicators';
import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { StateChip, StateMark } from '../../ui/StateMark';
import { ladder } from './escalation';

export function ScoreBlock() {
  const { score, counts } = useAssessment();
  const open = useMission((s) => s.open);
  const outside = counts.watch + counts.alert;
  const level = score.escalation === 'self' ? 'plain' : score.escalation === 'cmo' ? 'watch' : 'alert';
  const sentence = !score.complete
    ? `Incomplete: ${score.measured} of 7 readings. Measure the rest to finish the score.`
    : score.escalation === 'self'
      ? outside
        ? `The score is low, but ${outside} ${outside === 1 ? 'system is' : 'systems are'} outside your usual range.`
        : 'The score is low and every system is within your usual range.'
      : score.escalation === 'cmo'
        ? 'Tell the Crew Medical Officer now.'
        : 'Tell the Crew Medical Officer and the flight surgeon now.';
  return (
    <section className="score" aria-label="Early warning score">
      <button type="button" className="score-open" onClick={() => open('news')}>
        <span className="micro">Early warning score / NEWS2</span>
        <span className="score-figure">
          <strong>{score.complete ? score.total : '—'}</strong>
          <span>of 20</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </button>
      <div className="score-chips">
        <span className={`state-chip is-${level}`}>{score.risk} risk</span>
        {outside > 0 && <StateChip status={counts.alert ? 'alert' : 'watch'} />}
      </div>
      <p className="score-sentence">{sentence}</p>
    </section>
  );
}

export function SystemsPanel() {
  const { states, counts, score, readings } = useAssessment();
  const selected = useMission((s) => s.selected);
  const select = useMission((s) => s.select);
  const open = useMission((s) => s.open);
  const env = environments[useMission((s) => s.environment)];
  const step = ladder(env.delayMin).find((l) => l.id === score.escalation)!;
  return (
    <section className="console" aria-label="Body systems">
      <header className="console-head">
        <span>Body systems</span>
        <span>{String(systems.length).padStart(2, '0')}</span>
      </header>
      <p className="console-summary micro">
        <span>● {String(counts.normal).padStart(2, '0')} normal</span>
        {counts.watch > 0 && <span className="is-watch">▲ {String(counts.watch).padStart(2, '0')} watch</span>}
        {counts.alert > 0 && <span className="is-alert">◆ {String(counts.alert).padStart(2, '0')} alert</span>}
        {counts.missing > 0 && <span>— {String(counts.missing).padStart(2, '0')} no data</span>}
      </p>
      <ul className="console-list">
        {systems.map((sys) => {
          const head = sys.readings[0];
          const v = readings[head];
          return (
            <li key={sys.id}>
              <button
                type="button"
                className={`console-row is-${states[sys.id]} ${selected === sys.id ? 'is-selected' : ''}`}
                aria-pressed={selected === sys.id}
                onClick={() => select(sys.id)}
              >
                <span className="console-code">{sys.code}</span>
                <span className="console-name">
                  <b>{sys.short}</b>
                  <StateMark status={states[sys.id]} />
                </span>
                <span className="console-value">
                  {formatValue(head, v)}
                  <small>{v !== null && indicators[head].kind === 'number' ? indicators[head].unit : ''}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="console-foot" onClick={() => open('news')}>
        <span className="micro">Who to tell</span>
        <span><b>{step.who}</b> {step.detail}</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </button>
    </section>
  );
}
