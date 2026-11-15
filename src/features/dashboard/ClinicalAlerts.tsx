import { ArrowUpRight } from 'lucide-react';
import { formatValue, indicators } from '../../data/indicators';
import { stateShape } from '../../engine/status';
import { useAssessment } from '../../store/derived';
import type { Assessment } from '../../store/healthStore';
import { clinicalBreaches, news2Note } from './cause';

/**
 * Readings past an absolute clinical limit, with the limit, its source and what NEWS2 makes of the
 * same reading. The contact plan follows these breaches too, even when NEWS2 is low or incomplete.
 */
export function ClinicalAlerts({ assessment }: {
  assessment?: Pick<Assessment, 'readings' | 'latest'>;
} = {}) {
  const stored = useAssessment();
  const snapshot = assessment ?? stored;
  const breaches = clinicalBreaches(snapshot.readings, snapshot.latest);
  if (!breaches.length) return null;
  const worst = breaches[0].severity;
  return (
    <section className={`clinical-alerts aura is-${worst}`} aria-label="Clinical limits">
      <span className="micro">{worst === 'alert' ? 'Monitoring alert' : 'Monitoring review'} · contextual references</span>
      <ul>
        {breaches.map((breach) => (
          <li key={breach.id}>
            <span aria-hidden="true">{stateShape[breach.severity]}</span>
            <b>{indicators[breach.id].name} {formatValue(breach.id, snapshot.readings[breach.id])} {indicators[breach.id].unit}</b>
            <small>{breach.message} · {news2Note(breach)} · <a href={breach.sourceUrl} target="_blank" rel="noreferrer">{breach.source} <ArrowUpRight size={10} aria-hidden="true" /></a></small>
          </li>
        ))}
      </ul>
      <p>Source thresholds, sample context and reported symptoms inform these monitoring flags. Watch/alert labels and onboard contacts are app adaptations, not institutional triage grades or diagnoses. Review with the Crew Medical Officer even when NEWS2 is low; concern about a crewmate overrides any score.</p>
    </section>
  );
}
