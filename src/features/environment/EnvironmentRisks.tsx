import { ArrowUpRight } from 'lucide-react';
import { featuredHazards, featuredRisks } from '../../engine/environment';
import type { EnvironmentKind, ZoneId } from '../../engine/types';
import { getHazardById, getRisksByZone } from '../../data/nasa';
import { environments, type EnvironmentId } from '../../data/mission';
import './environment-risks.css';

const ENVIRONMENT_KINDS: Record<EnvironmentId, EnvironmentKind> = {
  transit: 'spacecraft',
  station: 'spaceStation',
  rover: 'rover',
  base: 'planetaryBase',
};

/**
 * RF-31: which spaceflight hazards the current environment brings forward, and the NASA HRP
 * risks for one body zone ordered by them. Store-independent: the host passes both ids.
 */
export function EnvironmentRisks({ environment, zoneId }: { environment: EnvironmentId; zoneId: ZoneId }) {
  const kind = ENVIRONMENT_KINDS[environment];
  const hazards = featuredHazards(kind);
  const featured = new Set(featuredRisks(kind).map((risk) => risk.id));
  const zoneRisks = getRisksByZone(zoneId);
  const first = zoneRisks.filter((risk) => featured.has(risk.id));
  const rest = zoneRisks.filter((risk) => !featured.has(risk.id));
  return (
    <section className="environment-risks" aria-label={`Spaceflight risks in ${environments[environment].name}`}>
      <span className="micro">Featured in {environments[environment].name}</span>
      <ul className="environment-hazards">
        {hazards.map((id) => {
          const hazard = getHazardById(id);
          return hazard ? (
            <li key={id}><a href={hazard.nasaUrl} target="_blank" rel="noreferrer">{hazard.name}</a></li>
          ) : null;
        })}
      </ul>
      {zoneRisks.length > 0 ? (
        <ol className="environment-zone-risks">
          {[...first, ...rest].map((risk) => (
            <li key={risk.id} className={featured.has(risk.id) ? 'is-featured' : undefined}>
              <a href={risk.officialUrl} target="_blank" rel="noreferrer">
                <b>{featured.has(risk.id) ? 'Featured here' : 'Also tracked'}</b>
                <span>{risk.title.replace(/^Risk of /, '')}</span>
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p>No NASA HRP risk is mapped to this system in the shared catalog.</p>
      )}
      <p className="environment-risks-note">NASA Human Research Program risks, paraphrased per system. The environment changes their order, not their content.</p>
    </section>
  );
}
