import { describe, expect, it } from 'vitest';
import { causeOf, clinicalBreaches } from './cause';
import type { IndicatorId } from '../../data/indicators';
import type { Status } from '../../engine/status';
import type { GlucoseContext } from '../../engine';
import { emptyReadings } from '../measurements/adapter';

const devs = (map: Partial<Record<IndicatorId, Status>>) =>
  new Proxy({} as Record<IndicatorId, { status: Status }>, { get: (_, id) => ({ status: map[id as IndicatorId] ?? 'normal' }) });

describe('the cause of a system state', () => {
  it('points at the reading that made the system red', () => {
    expect(causeOf(['pulse', 'systolic', 'diastolic'], devs({ systolic: 'alert' }))).toBe('systolic');
  });
  it('keeps the first reading when all are well', () => {
    expect(causeOf(['pulse', 'systolic', 'diastolic'], devs({}))).toBe('pulse');
  });
  it('prefers alert over watch', () => {
    expect(causeOf(['pulse', 'systolic', 'diastolic'], devs({ pulse: 'watch', diastolic: 'alert' }))).toBe('diastolic');
  });
});

describe('clinical breaches use the assessed glucose context', () => {
  const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma' };
  const readings = (value: number) => {
    const all = emptyReadings();
    all.glucose = value;
    return all;
  };

  it('keeps 130 out of the breach list when the context is unknown', () => {
    expect(clinicalBreaches(readings(130))).toEqual([]);
  });

  it('pairs severity and message for a known fasting venous context', () => {
    const [breach] = clinicalBreaches(readings(130), { glucose: { ctx: fastingVenous } });
    expect(breach.severity).toBe('watch');
    expect(breach.message).toContain('screening watch');
    expect(breach.sourceUrl).toBe('https://diabetes.org/about-diabetes/diagnosis');
  });

  it('alerts at 200 for every context', () => {
    expect(clinicalBreaches(readings(200))[0]?.severity).toBe('alert');
  });
});
