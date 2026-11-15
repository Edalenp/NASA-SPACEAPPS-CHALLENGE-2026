/**
 * Personal-baseline comparison and system state.
 * Alert: a NEWS2 parameter scores 3 or a clinical limit alerts. Watch: a positive
 * NEWS2 score, a clinical watch or a reading outside an actual personal baseline.
 */
import { indicators, type IndicatorId, type ReadingValue } from '../data/indicators';
import { indicatorTypes } from '../data/indicator-contract';
import { systems, type SystemId } from '../data/mission';
import type { Baseline } from './baseline';
import { clinicalMessage, clinicalSeverity } from './clinicalLimits';
import { isKnownGlucoseContext } from './glucoseContext';
import { news2Params, paramScore, type News2Param } from './news2';
import type { GlucoseContext } from './types';

export type Status = 'normal' | 'watch' | 'alert' | 'missing';

export const statusLabel: Record<Status, string> = { normal: 'Normal', watch: 'Watch', alert: 'Alert', missing: 'No data' };
/** Every state carries a shape and a word, never colour alone. */
export const stateShape: Record<Status, string> = { normal: '●', watch: '▲', alert: '◆', missing: '—' };
const rank: Record<Status, number> = { missing: 0, normal: 1, watch: 2, alert: 3 };

export interface Deviation {
  status: Status;
  /** Signed distance outside the personal observed range, 0 when inside or absent. */
  delta: number;
  text: string;
}

const isNews2Param = (id: IndicatorId): id is News2Param =>
  (news2Params as readonly string[]).includes(id);

/**
 * @param baseline Calculated personal baseline (mean ± 2 SD). Only an actual baseline
 *   provides a personal range; the old illustrative `usual` band is never a patient claim.
 *
 * The personal band is a change detector, never a clinical validator: a value breaching
 * an absolute clinical limit keeps its clinical status even when it sits inside a
 * collapsed or chronically elevated personal band.
 */
export function deviation(
  id: IndicatorId,
  v: ReadingValue | null,
  baseline?: Baseline,
  context?: GlucoseContext,
): Deviation {
  if (v === null || v === undefined) return { status: 'missing', delta: 0, text: 'Not measured today' };
  const ind = indicators[id];
  if (ind.kind === 'choice') {
    const score = isNews2Param(id) ? paramScore(id, v) : null;
    if (score === null) return { status: 'missing', delta: 0, text: 'No NEWS2 value for this reading' };
    return {
      status: score === 3 ? 'alert' : score > 0 ? 'watch' : 'normal',
      delta: 0,
      text: score === 0 ? 'Within NEWS2 range' : `NEWS2 scores this reading ${score}`,
    };
  }
  const n = v as number;
  const outside = baseline !== undefined && (n < baseline.lower || n > baseline.upper);
  const delta = outside && baseline ? (n < baseline.lower ? n - baseline.lower : n - baseline.upper) : 0;
  const unit = ind.unit === '%' ? ' %' : ind.unit.startsWith('/') || ind.unit === '1–5' ? '' : ` ${ind.unit}`;
  const mag = Math.abs(Math.round(delta * 10) / 10);
  const type = indicatorTypes[id];
  const clinical = type ? clinicalSeverity(type, n, context) : null;
  const clinicalText = type ? clinicalMessage(type, n, context) : null;
  const score = isNews2Param(id) ? paramScore(id, n) : null;
  const personal = baseline !== undefined;
  const status: Status =
    score === 3 || clinical === 'alert'
      ? 'alert'
      : (score ?? 0) > 0 || clinical === 'watch' || outside
        ? 'watch'
        : personal || score === 0
          ? 'normal'
          : 'missing';
  const contextNote =
    id === 'glucose' && !isKnownGlucoseContext(context) ? ' · glucose context unknown' : '';
  const text =
    clinicalText ??
    (outside
      ? `${mag}${unit} ${delta > 0 ? 'above' : 'below'} personal observed history${contextNote}`
      : personal
        ? `Within your personal observed history${contextNote}`
        : score !== null
          ? score === 0
            ? 'Within NEWS2 range'
            : `NEWS2 scores this reading ${score}`
          : id === 'glucose' && !isKnownGlucoseContext(context)
            ? 'Context needed · glucose timing and specimen'
            : 'Context needed · no personal baseline or clinical reference');
  return { status, delta, text };
}

export function worst(list: Status[]): Status {
  const measured = list.filter((s) => s !== 'missing');
  if (!measured.length) return 'missing';
  return measured.reduce((a, b) => (rank[b] > rank[a] ? b : a), 'normal');
}

export function systemStatus(id: SystemId, readings: Record<IndicatorId, ReadingValue | null>): Status {
  const sys = systems.find((s) => s.id === id)!;
  return worst(sys.readings.map((r) => deviation(r, readings[r]).status));
}
