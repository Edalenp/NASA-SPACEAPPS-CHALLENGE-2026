import { describe, expect, it } from 'vitest';
import { generateMission } from './simulator';
import { generateMissionSnapshot } from './snapshot';

const options = { seed: 2026, crewMemberId: 'snapshot-crew', startDate: new Date('2026-10-06T00:00:00.000Z') };

describe('mission snapshots', () => {
  it.each(['2026-11-16T00:00:00.000Z', '2026-11-16T00:00:01.000Z', '2026-11-16T02:19:00.000Z', '2026-11-16T10:00:00.000Z', '2026-11-16T23:59:59.000Z'])(
    'includes today without future records at %s', time => {
      const snapshot = generateMissionSnapshot({ ...options, asOf: new Date(time) });
      expect(snapshot.measurements.filter(m => m.missionDay === 42)).toHaveLength(10);
      expect(snapshot.measurements.every(m => m.measuredAt <= time && m.missionDay! <= 42)).toBe(true);
      expect(snapshot.observations).toHaveLength(42);
      expect(snapshot.oxygenSupport).toHaveLength(42);
      for (const rows of [snapshot.observations, snapshot.oxygenSupport]) {
        expect(rows.every(o => o.observedAt <= time && o.source === 'simulator')).toBe(true);
        expect(rows.at(-1)?.observedAt.slice(0, 10)).toBe(time.slice(0, 10));
      }
    },
  );
  it('is reproducible for an explicit cutoff and retains the seeded numeric values', () => {
    const asOf = new Date('2026-11-16T02:19:00.000Z');
    const snapshot = generateMissionSnapshot({ ...options, asOf });
    expect(snapshot).toEqual(generateMissionSnapshot({ ...options, asOf }));
    const full = generateMission({ ...options, days: 42 });
    expect(snapshot.measurements.map(m => [m.id, m.value])).toEqual(full.map(m => [m.id, m.value]));
    expect(snapshot.measurements.filter(m => m.missionDay! < 42)).toEqual(full.filter(m => m.missionDay! < 42));
    expect(snapshot.observations.every(o => o.level === 'alert')).toBe(true);
    expect(snapshot.oxygenSupport.every(o => o.value === 'air')).toBe(true);
  });
  it('does not cross into yesterday for a first-day midnight visit', () => {
    const snapshot = generateMissionSnapshot({ ...options, asOf: options.startDate });
    expect(snapshot.measurements).toHaveLength(13);
    expect(snapshot.measurements.every(m => m.measuredAt === options.startDate.toISOString())).toBe(true);
    expect(snapshot.observations).toHaveLength(1);
  });
  it('returns no records before the mission and caps the lab history at 180 days', () => {
    expect(generateMissionSnapshot({ ...options, asOf: new Date('2026-10-05T23:59:59.000Z') })).toEqual({ measurements: [], observations: [], oxygenSupport: [] });
    const snapshot = generateMissionSnapshot({ ...options, asOf: new Date('2028-01-01T00:00:00.000Z') });
    expect(snapshot.observations).toHaveLength(180);
    expect(Math.max(...snapshot.measurements.map(m => m.missionDay!))).toBe(180);
  });
});
