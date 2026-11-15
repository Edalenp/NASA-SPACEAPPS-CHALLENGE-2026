import { describe, expect, it } from 'vitest';
import type { GlucoseContext, IndicatorType } from '../../engine';
import { readingsAt, type RecordEntry } from '../measurements/adapter';
import { assess } from '../measurements/assessment';
import { clinicalBreaches } from '../dashboard/cause';
import {
  assessEmergencyReadings,
  consoleAuxiliaryEvidence,
  consoleEvidence,
  isEmergencyAssessment,
  toEngineEnvironment,
} from './assessment';

const at = '2026-11-14T15:00:00.000Z';
const subject = { id: 'JL-02', name: 'Jordan Lee' };
const env = { id: 'transit', name: 'Transit vehicle', communicationDelayMinutes: 11.7 };
const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma' };
const entry = (
  indicator: RecordEntry['indicator'],
  value: RecordEntry['value'],
  source: RecordEntry['source'] = 'manual',
): RecordEntry => ({
  indicator,
  value,
  timestamp: at,
  source,
  recordId: `${indicator}-${String(value)}-${source}`,
});

const core = [
  entry('pulse', 70), entry('systolic', 120), entry('respiration', 16), entry('spo2', 98),
  entry('temperature', 37), entry('consciousness', 'alert'), entry('oxygen', 'air'),
];
const legacyAux = [entry('glucose', 40, 'legacy'), entry('diastolic', 130, 'legacy')];

describe('legacy auxiliary readings keep their real provenance', () => {
  it('lets legacy glucose 40 and DBP 130 warn without touching the seven NEWS2 rows', () => {
    const entries = [...core, ...legacyAux];
    const dashboard = assess(entries, at, 'transit');
    const breaches = clinicalBreaches(dashboard.readings, dashboard.latest);
    expect(breaches.map((breach) => breach.id)).toEqual(expect.arrayContaining(['glucose', 'diastolic']));

    const snapshot = readingsAt(entries, at);
    const auxiliary = consoleAuxiliaryEvidence(snapshot.readings, snapshot.latest);
    expect(auxiliary).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'glucose', value: 40, source: 'legacy', ctx: { timing: 'unknown', specimen: 'unknown' } }),
      expect.objectContaining({ id: 'diastolicBloodPressure', value: 130, source: 'legacy' }),
    ]));

    const evidence = consoleEvidence(snapshot.readings, snapshot.latest);
    expect(evidence).toHaveLength(7);
    const emergency = assessEmergencyReadings(subject, toEngineEnvironment(env), evidence, at, 'legacy-aux', {
      auxiliaryEvidence: auxiliary,
    });
    expect(emergency.alert?.crewMemberId).toBe(subject.id);
    expect(emergency.alert?.zones.immuneMetabolic.state).toBe('alert');
    expect(emergency.alert?.zones.heartCirculation.state).toBe('alert');
    expect(emergency.plan?.steps.some((step) => step.contactRole === 'medicalOfficer' && step.channel === 'onboard')).toBe(true);
    expect(emergency.evidence).toHaveLength(7);
  });

  it('keeps missing oxygen unknown rather than imputing cabin air', () => {
    const entries = [...core.filter((row) => row.indicator !== 'oxygen'), ...legacyAux];
    const snapshot = readingsAt(entries, at);
    const emergency = assessEmergencyReadings(subject, toEngineEnvironment(env), consoleEvidence(snapshot.readings, snapshot.latest), at, 'no-oxygen', {
      auxiliaryEvidence: consoleAuxiliaryEvidence(snapshot.readings, snapshot.latest),
    });
    expect(emergency.input.onSupplementalOxygen).toBe(false);
    expect(emergency.result).toBeNull();
    expect(emergency.plan).toBeNull();
  });
});

describe('captured auxiliary metadata validation', () => {
  const auxiliary = {
    id: 'glucose' as IndicatorType,
    label: 'Blood glucose',
    value: 95,
    unit: 'mg/dL',
    source: 'manual' as const,
    recordedAt: at,
    ctx: fastingVenous,
  };
  const snapshot = readingsAt(core, at);
  const valid = assessEmergencyReadings(subject, toEngineEnvironment(env), consoleEvidence(snapshot.readings, snapshot.latest), at, 'capture', {
    auxiliaryEvidence: [auxiliary],
    auxiliaryCurrentValues: { glucose: 95 },
    auxiliaryBaselines: { glucose: { mean: 95, sd: 5, lower: 85, upper: 105, sampleCount: 7 } },
    glucoseContext: fastingVenous,
  });

  it('accepts the constructor payload and an old capture without auxiliary fields', () => {
    expect(isEmergencyAssessment(valid)).toBe(true);
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryEvidence: [{ ...auxiliary, source: 'legacy' }],
    })).toBe(true);
    const old = assessEmergencyReadings(subject, toEngineEnvironment(env), consoleEvidence(snapshot.readings, snapshot.latest), at, 'old');
    expect(isEmergencyAssessment(old)).toBe(true);
  });

  it('rejects arrays and malformed root/row contexts', () => {
    expect(isEmergencyAssessment({ ...valid, glucoseContext: [] })).toBe(false);
    expect(isEmergencyAssessment({ ...valid, glucoseContext: { timing: 'bogus', specimen: 'venousPlasma' } })).toBe(false);
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryEvidence: [{ ...auxiliary, ctx: [] }],
    })).toBe(false);
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryEvidence: [{ ...auxiliary, ctx: { timing: 'fasting', specimen: 'capillary' } }],
    })).toBe(false);
  });

  it('rejects unknown, duplicate or contradictory auxiliary rows', () => {
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryEvidence: [{ ...auxiliary, id: 'heartRate' }],
    })).toBe(false);
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryEvidence: [auxiliary, auxiliary],
    })).toBe(false);
    expect(isEmergencyAssessment({ ...valid, auxiliaryCurrentValues: { glucose: 200 } })).toBe(false);
    expect(isEmergencyAssessment({ ...valid, auxiliaryCurrentValues: { notAnIndicator: 1 } })).toBe(false);
  });

  it('rejects unknown or malformed baselines while keeping the valid map', () => {
    expect(isEmergencyAssessment({ ...valid, auxiliaryCurrentValues: { glucose: 95 } })).toBe(true);
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryBaselines: { notAnIndicator: { mean: 95, sd: 5, lower: 85, upper: 105, sampleCount: 7 } },
    })).toBe(false);
    expect(isEmergencyAssessment({
      ...valid,
      auxiliaryBaselines: { glucose: { mean: 95, sd: Number.NaN, lower: 85, upper: 105, sampleCount: 7 } },
    })).toBe(false);
  });
});
