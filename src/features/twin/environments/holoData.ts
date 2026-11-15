import type { IndicatorId } from '../../../data/indicators';
import { dayKey, DAY_MS, type RecordEntry } from '../../measurements/adapter';

export interface DayPoint {
  day: string;
  value: number;
  simulated: boolean;
}

export interface HoloSeries {
  points: DayPoint[];
  /** Days covered by the window, so the x axis keeps real spacing even with gaps. */
  days: number;
  /** 'recorded', 'simulation', 'mixed' or 'none': printed on the panel so it is never mistaken. */
  provenance: 'recorded' | 'simulation' | 'mixed' | 'none';
}

/**
 * The last reading of each day for one indicator, over the `days` days ending `now`, taken from
 * the stored records only. Nothing is invented: missing days stay missing, legacy-scale rows are
 * dropped, and simulated readings are flagged so the cabin display can label them.
 */
export function holoSeries(entries: readonly RecordEntry[], id: IndicatorId, now: string, days = 30): HoloSeries {
  const end = dayKey(now);
  const start = new Date(Date.parse(end) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  const byDay = new Map<string, RecordEntry>();
  for (const entry of entries) {
    if (entry.indicator !== id || typeof entry.value !== 'number' || entry.legacyScale) continue;
    if (entry.timestamp > now) continue;
    const day = dayKey(entry.timestamp);
    if (day < start || day > end) continue;
    const kept = byDay.get(day);
    if (!kept || entry.timestamp > kept.timestamp) byDay.set(day, entry);
  }
  const points = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, entry]) => ({ day, value: entry.value as number, simulated: entry.source === 'simulator' }));
  const simulated = points.filter((p) => p.simulated).length;
  const provenance = !points.length ? 'none' : simulated === points.length ? 'simulation' : simulated ? 'mixed' : 'recorded';
  return { points, days, provenance };
}

/** Position of a day inside the window, 0 for the first day and 1 for today. */
export function dayOffset(day: string, now: string, days: number): number {
  const fromEnd = (Date.parse(dayKey(now)) - Date.parse(day)) / DAY_MS;
  return days <= 1 ? 1 : 1 - fromEnd / (days - 1);
}
