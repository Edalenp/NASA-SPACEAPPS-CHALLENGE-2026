import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '../../measurements/adapter';
import { dayOffset, holoSeries } from './holoData';

const NOW = '2026-11-15T12:00:00.000Z';
const entry = (timestamp: string, value: number, source: RecordEntry['source'] = 'manual', extra: Partial<RecordEntry> = {}): RecordEntry =>
  ({ indicator: 'pulse', value, timestamp, recordId: `${timestamp}-${value}`, source, ...extra }) as RecordEntry;

describe('holoSeries', () => {
  it('shows nothing rather than a static history when there are no records', () => {
    expect(holoSeries([], 'pulse', NOW)).toEqual({ points: [], days: 30, provenance: 'none' });
  });

  it('keeps the last reading of each day, in order, and skips future and other readings', () => {
    const series = holoSeries([
      entry('2026-11-14T08:00:00.000Z', 70),
      entry('2026-11-14T20:00:00.000Z', 74),
      entry('2026-11-15T09:00:00.000Z', 80),
      entry('2026-11-15T18:00:00.000Z', 120),
      { ...entry('2026-11-15T10:00:00.000Z', 30), indicator: 'respiration' } as RecordEntry,
    ], 'pulse', NOW);
    expect(series.points.map((p) => [p.day, p.value])).toEqual([['2026-11-14', 74], ['2026-11-15', 80]]);
    expect(series.provenance).toBe('recorded');
  });

  it('labels simulated and mixed series and drops legacy-scale rows', () => {
    expect(holoSeries([entry('2026-11-15T09:00:00.000Z', 80, 'simulator')], 'pulse', NOW).provenance).toBe('simulation');
    const mixed = holoSeries([
      entry('2026-11-13T09:00:00.000Z', 80, 'simulator'),
      entry('2026-11-15T09:00:00.000Z', 82),
      entry('2026-11-14T09:00:00.000Z', 9, 'legacy', { legacyScale: true }),
    ], 'pulse', NOW);
    expect(mixed.provenance).toBe('mixed');
    expect(mixed.points).toHaveLength(2);
  });

  it('ignores records older than the window', () => {
    expect(holoSeries([entry('2026-10-01T09:00:00.000Z', 80)], 'pulse', NOW).points).toEqual([]);
  });

  it('places days on the real calendar', () => {
    expect(dayOffset('2026-11-15', NOW, 30)).toBe(1);
    expect(dayOffset('2026-10-17', NOW, 30)).toBe(0);
  });
});
