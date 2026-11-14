/**
 * Personal-baseline comparison and system state.
 * Alert: a NEWS2 parameter scores 3. Watch: outside the personal usual range.
 */
import { indicators, type IndicatorId, type ReadingValue } from '../data/indicators';
import { systems, type SystemId } from '../data/mission';
import type { Baseline } from './baseline';
import { news2Params, paramScore, type News2Param } from './consoleNews2';

export type Status = 'normal' | 'watch' | 'alert' | 'missing';

export const statusLabel: Record<Status, string> = { normal: 'Normal', watch: 'Watch', alert: 'Alert', missing: 'No data' };
/** Every state carries a shape and a word, never colour alone. */
export const stateShape: Record<Status, string> = { normal: '●', watch: '▲', alert: '◆', missing: '—' };
const rank: Record<Status, number> = { missing: 0, normal: 1, watch: 2, alert: 3 };

export interface Deviation {
  status: Status;
  /** Signed distance outside the usual range, 0 when inside. */
  delta: number;
  text: string;
}

/**
 * @param baseline Calculated personal baseline (mean ± 2 SD). When present it
 *   replaces the static `usual` band, so the UI can migrate to T5b without
 *   breaking callers that pass nothing.
 */
export function deviation(
  id: IndicatorId,
  v: ReadingValue | null,
  baseline?: Baseline,
): Deviation {
  if (v === null || v === undefined) return { status: 'missing', delta: 0, text: 'Not measured today' };
  const ind = indicators[id];
  const red = (news2Params as readonly string[]).includes(id) && paramScore(id as News2Param, v) === 3;
  if (ind.kind === 'choice') {
    const off = ind.usual !== undefined && v !== ind.usual;
    return { status: red ? 'alert' : off ? 'watch' : 'normal', delta: 0, text: off ? 'Changed from usual' : 'As usual' };
  }
  const n = v as number;
  const [lo, hi] = baseline ? [baseline.lower, baseline.upper] : (ind.usual ?? [-Infinity, Infinity]);
  const delta = n < lo ? n - lo : n > hi ? n - hi : 0;
  const unit = ind.unit === '%' ? ' %' : ind.unit.startsWith('/') || ind.unit === '1–5' ? '' : ` ${ind.unit}`;
  const mag = Math.abs(Math.round(delta * 10) / 10);
  const text = delta === 0 ? 'Within your usual range' : `${mag}${unit} ${delta > 0 ? 'above' : 'below'} usual`;
  return { status: red ? 'alert' : delta !== 0 ? 'watch' : 'normal', delta, text };
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
