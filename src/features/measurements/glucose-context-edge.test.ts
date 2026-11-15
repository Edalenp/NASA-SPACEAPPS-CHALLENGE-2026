import { describe, expect, it } from 'vitest';
import { calculateBaseline } from '../../engine/baseline';
import { deviation } from '../../engine/status';
import type { GlucoseContext } from '../../engine';
import { assess } from './assessment';
import type { RecordEntry } from './adapter';

const now = '2026-11-14T15:00:00.000Z';
const unknown: GlucoseContext = { timing: 'unknown', specimen: 'unknown' };
const baseline = calculateBaseline([70, 70, 70, 70, 70, 70, 70])!;
const entry = (value: number, timestamp: string): RecordEntry => ({
  indicator: 'glucose',
  value,
  timestamp,
  source: 'manual',
  recordId: `glucose-${timestamp}`,
  ctx: unknown,
});

describe('unknown glucose context outside a real personal baseline', () => {
  it('keeps the context qualification on the personal watch text', () => {
    const result = deviation('glucose', 130, baseline, unknown);
    expect(result.status).toBe('watch');
    expect(result.text).toContain('personal observed history');
    expect(result.text).toContain('glucose context unknown');
  });

  it('keeps the same qualification in the assessment deviation', () => {
    const prior = Array.from({ length: 7 }, (_, i) =>
      entry(70, `2026-11-14T08:0${i}:00.000Z`),
    );
    const result = assess([...prior, entry(130, now)], now, 'transit');
    expect(result.deviations.glucose.status).toBe('watch');
    expect(result.deviations.glucose.text).toContain('personal observed history');
    expect(result.deviations.glucose.text).toContain('glucose context unknown');
  });
});
