import { ArrowUpRight } from 'lucide-react';
import { formatValue, indicators } from '../../data/indicators';
import { stateShape } from '../../engine/status';
import { useAssessment } from '../../store/derived';
import { clinicalBreaches } from './cause';

/**
 * Readings past an absolute clinical limit, with the limit and its source. The engine's contact
 * plan follows NEWS2 only, so this says so instead of letting "no scheduled contacts" stand alone.
 */
export function ClinicalAlerts() {
  const { readings } = useAssessment();
  const breaches = clinicalBreaches(readings);
  if (!breaches.length) return null;
  const worst = breaches[0].severity;
  return (
    <section className={`clinical-alerts aura is-${worst}`} aria-label="Clinical limits">
      <span className="micro">{worst === 'alert' ? 'Clinical alert' : 'Clinical watch'} · outside NEWS2</span>
      <ul>
        {breaches.map((breach) => (
          <li key={breach.id}>
            <span aria-hidden="true">{stateShape[breach.severity]}</span>
            <b>{indicators[breach.id].name} {formatValue(breach.id, readings[breach.id])} {indicators[breach.id].unit}</b>
            <small>{breach.message} · <a href={breach.sourceUrl} target="_blank" rel="noreferrer">{breach.source} <ArrowUpRight size={10} aria-hidden="true" /></a></small>
          </li>
        ))}
      </ul>
      <p>NEWS2 does not score this, and the automatic contact plan follows NEWS2 only. Review it with the Crew Medical Officer; concern about a crewmate overrides the score.</p>
    </section>
  );
}
