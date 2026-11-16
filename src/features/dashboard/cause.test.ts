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
  const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma', fastingHours: 8 };
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
    expect(breach.message).toContain('fasting-plasma laboratory criterion');
    expect(breach.sourceUrl).toBe('https://doi.org/10.2337/dc26-S002');
  });

  it('does not turn an isolated 200 into a universal alert', () => {
    expect(clinicalBreaches(readings(200))).toEqual([]);
    expect(clinicalBreaches(readings(200), { glucose: { ctx: fastingVenous } })[0]?.severity).toBe('watch');
  });
});

describe('clinical flag citations follow the rule actually shown', () => {
  it.each([
    ['temperature', 38, 'Cleveland Clinic', 'my.clevelandclinic.org'],
    ['temperature', 40.1, 'AMBOSS', 'library.amboss.com'],
    ['spo2', 93, 'British Thoracic Society', 'bmjopenrespres.bmj.com'],
    ['spo2', 89, 'American Thoracic Society', 'www.thoracic.org'],
  ] as const)('cites the threshold source for %s at %s', (id, value, author, host) => {
    const readings = emptyReadings();
    readings[id] = value;
    const [breach] = clinicalBreaches(readings);
    expect(breach.source).toContain(author);
    expect(new URL(breach.sourceUrl).host).toBe(host);
  });
});
