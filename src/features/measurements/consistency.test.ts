import { describe, expect, it } from 'vitest';
import { assess } from './assessment';
import type { RecordEntry } from './adapter';
import { indicators, type IndicatorId } from '../../data/indicators';
import { indicatorTypes } from '../../data/indicator-contract';
import { systems } from '../../data/mission';
import { CLINICAL_LIMITS } from '../../engine/clinicalLimits';

const now = '2026-11-15T06:00:00.000Z';
const rank = { missing: 0, normal: 1, watch: 2, alert: 3 } as const;
const entry = (indicator: IndicatorId, value: number): RecordEntry => ({ recordId: `${indicator}-${value}`, indicator, value, timestamp: now, source: 'manual' });

/** Every value on either side of every clinical limit the engine knows about. */
const probes = (Object.keys(indicators) as IndicatorId[]).flatMap((id) => {
  const type = indicatorTypes[id];
  const rules = type ? CLINICAL_LIMITS[type]?.rules : undefined;
  const ind = indicators[id];
  if (!rules || ind.kind !== 'number') return [];
  return Object.values(rules).flatMap((limit) => [limit - ind.step * 2, limit + ind.step * 2])
    .filter((value) => value >= ind.min && value <= ind.max)
    .map((value) => [id, value] as const);
});

describe('a red system always has a red reading behind it', () => {
  it.each(probes)('%s at %s', (id, value) => {
    const result = assess([entry(id, value)], now, 'transit');
    for (const sys of systems) {
      const worst = Math.max(...sys.readings.map((r) => rank[result.deviations[r].status]));
      // The system may only be as bad as its worst reading, never worse without a cause to show.
      if (result.states[sys.id] === 'alert' || result.states[sys.id] === 'watch') {
        expect(worst, `${sys.id} is ${result.states[sys.id]} but no reading explains it`).toBeGreaterThanOrEqual(rank[result.states[sys.id]]);
      }
    }
  });
});
