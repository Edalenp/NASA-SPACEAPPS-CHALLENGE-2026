import { indicators, type IndicatorId, type ReadingValue } from '../../data/indicators';
import { indicatorTypes } from '../../data/indicator-contract';
import { CLINICAL_LIMITS, clinicalMessage, clinicalSeverity, type ClinicalSeverity } from '../../engine/clinicalLimits';
import type { Status } from '../../engine/status';

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

export interface ClinicalBreach { id: IndicatorId; severity: ClinicalSeverity; message: string; source: string; sourceUrl: string }

/**
 * Readings beyond one of the engine's absolute clinical limits (AHA, ADA, NHLBI…), worst first.
 * NEWS2 scores some of these as 0 (a systolic of 200 mmHg, say), so the interface must name
 * them on their own rather than let a low NEWS2 read as "all clear".
 */
export function clinicalBreaches(readings: Record<IndicatorId, ReadingValue | null>): ClinicalBreach[] {
  return (Object.keys(indicators) as IndicatorId[]).flatMap((id) => {
    const type = indicatorTypes[id];
    const value = readings[id];
    if (!type || typeof value !== 'number') return [];
    const severity = clinicalSeverity(type, value);
    const limit = CLINICAL_LIMITS[type];
    if (!severity || !limit) return [];
    return [{ id, severity, message: clinicalMessage(type, value) ?? '', source: limit.source, sourceUrl: limit.sourceUrl }];
  }).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'alert' ? -1 : 1));
}
