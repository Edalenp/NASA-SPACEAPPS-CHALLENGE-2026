import { indicators, type IndicatorId, type ReadingValue } from '../../data/indicators';
import { indicatorTypes } from '../../data/indicator-contract';
import { CLINICAL_LIMITS, clinicalMessage, clinicalSeverity, clinicalRuleSource, type ClinicalSeverity } from '../../engine/clinicalLimits';
import type { GlucoseContext } from '../../engine/types';
import type { Status } from '../../engine/status';
import { news2Params, paramScore, type News2Param } from '../../engine/news2';
import { ADA_DIAGNOSIS_SOURCE, ADA_MONITORING_SOURCE } from '../../engine/glucose';

const rank: Record<Status, number> = { missing: 0, normal: 1, watch: 2, alert: 3 };

/**
 * The reading that puts a set of readings in its state: the worst one, and among equals the first
 * listed. A system that turns red should point at the measurement that made it red.
 */
export function causeOf(ids: readonly IndicatorId[], deviations: Record<IndicatorId, { status: Status }>): IndicatorId {
  return ids.reduce((worst, id) => (rank[deviations[id].status] > rank[deviations[worst].status] ? id : worst), ids[0]);
}

export function needsLook(status: Status) {
  return status === 'watch' || status === 'alert';
}

export interface ClinicalBreach {
  id: IndicatorId;
  severity: ClinicalSeverity;
  message: string;
  source: string;
  sourceUrl: string;
  /** Points NEWS2 gives this reading, or null when NEWS2 does not score the parameter at all. */
  news2Points: number | null;
}

const isNews2Param = (id: IndicatorId): id is News2Param => (news2Params as readonly string[]).includes(id);

/** What NEWS2 says about a breached reading, so a limit is never described as "unscored" when it is scored. */
export function news2Note(breach: Pick<ClinicalBreach, 'id' | 'news2Points'>): string {
  if (breach.news2Points === null) return `NEWS2 does not score ${indicators[breach.id].name.toLowerCase()}`;
  if (breach.news2Points === 0) return 'NEWS2 scores this reading 0 points';
  return `NEWS2 also scores it ${breach.news2Points} ${breach.news2Points === 1 ? 'point' : 'points'}`;
}

/**
 * Readings beyond one of the engine's absolute clinical limits (AHA, ADA, NHLBI…), worst first.
 * NEWS2 scores some of these as 0 (a systolic of 200 mmHg, say), so the interface must name
 * them on their own rather than let a low NEWS2 read as "all clear".
 */
export function clinicalBreaches(
  readings: Record<IndicatorId, ReadingValue | null>,
  latest?: Partial<Record<IndicatorId, { ctx?: GlucoseContext }>>,
): ClinicalBreach[] {
  return (Object.keys(indicators) as IndicatorId[]).flatMap((id) => {
    const type = indicatorTypes[id];
    const value = readings[id];
    if (!type || typeof value !== 'number') return [];
    const context = id === 'glucose' ? latest?.[id]?.ctx : undefined;
    const severity = clinicalSeverity(type, value, context);
    const limit = CLINICAL_LIMITS[type];
    if (!severity || !limit) return [];
    const news2Points = isNews2Param(id) ? paramScore(id, value) : null;
    const citation = clinicalRuleSource(type, value, context)!;
    const sourceUrl = id === 'glucose' ? value < 70 ? ADA_MONITORING_SOURCE : ADA_DIAGNOSIS_SOURCE : citation.url;
    return [{ id, severity, message: clinicalMessage(type, value, context) ?? '', source: citation.label, sourceUrl, news2Points }];
  }).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'alert' ? -1 : 1));
}
