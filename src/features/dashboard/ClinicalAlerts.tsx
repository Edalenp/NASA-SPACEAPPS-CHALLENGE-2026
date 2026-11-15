import { ArrowUpRight } from 'lucide-react';
import { formatValue, indicators } from '../../data/indicators';
import { stateShape } from '../../engine/status';
import { useAssessment } from '../../store/derived';
import { clinicalBreaches, news2Note } from './cause';

/**
 * Readings past an absolute clinical limit, with the limit, its source and what NEWS2 makes of the
 * same reading. The contact plan follows these breaches too, even when NEWS2 is low or incomplete.
 */
export function ClinicalAlerts() {
  const { readings } = useAssessment();
  const breaches = clinicalBreaches(readings);
  if (!breaches.length) return null;
  const worst = breaches[0].severity;
  return (
    <section className={`clinical-alerts aura is-${worst}`} aria-label="Clinical limits">
      <span className="micro">{worst === 'alert' ? 'Clinical alert' : 'Clinical watch'} · absolute limits</span>
      <ul>
        {breaches.map((breach) => (
          <li key={breach.id}>
            <span aria-hidden="true">{stateShape[breach.severity]}</span>
            <b>{indicators[breach.id].name} {formatValue(breach.id, readings[breach.id])} {indicators[breach.id].unit}</b>
            <small>{breach.message} · {news2Note(breach)} · <a href={breach.sourceUrl} target="_blank" rel="noreferrer">{breach.source} <ArrowUpRight size={10} aria-hidden="true" /></a></small>
          </li>
        ))}
      </ul>
      <p>These limits come from the cited sources, not from NEWS2. A breach adds a Crew Medical Officer review to the contact plan even when the NEWS2 total is low. Concern about a crewmate overrides any score.</p>
    </section>
  );
}
