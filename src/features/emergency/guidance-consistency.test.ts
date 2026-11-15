import { describe, expect, it } from 'vitest';
import type { GlucoseContext } from '../../engine';
import { beginCase, attachAssessment } from './workflow';
import { isEmergencySession } from './journal';
import {
  assessEmergencyReadings,
  auxiliaryBaselinesFor,
  consoleAuxiliaryEvidence,
  consoleEvidence,
  evidenceSignature,
  isEmergencyAssessment,
  toEngineEnvironment,
} from './assessment';
import { readingsAt, type RecordEntry } from '../measurements/adapter';
import { assess } from '../measurements/assessment';
import { previewReading } from '../measurements/preview';
import { buildReport } from '../measurements/report';

const at = '2026-11-14T15:00:00.000Z';
const subject = { id: 'JL-02', name: 'Jordan Lee' };
const env = { id: 'transit', name: 'Transit vehicle', communicationDelayMinutes: 11.7 };
const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma' };
const randomCapillary: GlucoseContext = { timing: 'random', specimen: 'capillary' };

const entry = (indicator: RecordEntry['indicator'], value: RecordEntry['value'], ctx?: GlucoseContext): RecordEntry => ({
  indicator, value, timestamp: at, source: 'manual', recordId: `${indicator}-${String(value)}`, ...(ctx ? { ctx } : {}),
});
const vitals = (glucose = 40, ctx: GlucoseContext = fastingVenous) => [
  entry('pulse', 70), entry('systolic', 120), entry('respiration', 16), entry('spo2', 98),
  entry('temperature', 37), entry('consciousness', 'alert'), entry('oxygen', 'air'),
  entry('diastolic', 130), entry('glucose', glucose, ctx),
];
const dashboard = (entries = vitals()) => assess(entries, at, 'transit');
const snapshot = (entries: RecordEntry[]) => readingsAt(entries, at);
const emergency = (entries = vitals(), options: Parameters<typeof assessEmergencyReadings>[5] = {}) => {
  const snap = snapshot(entries);
  const evidence = consoleEvidence(snap.readings, snap.latest);
  const auxiliaryEvidence = consoleAuxiliaryEvidence(snap.readings, snap.latest);
  return assessEmergencyReadings(subject, toEngineEnvironment(env), evidence, at, 'emg-1', {
    auxiliaryEvidence, auxiliaryBaselines: auxiliaryBaselinesFor(dashboard(entries).baselines), glucoseContext: snap.latest.glucose?.ctx, ...options,
  });
};

describe('shared guidance across the four surfaces', () => {
  it('renders the same zone actions, contacts and NEWS2 from the same snapshot', () => {
    const assessment = dashboard();
    const emergencyAssessment = emergency();
    const preview = previewReading(vitals().filter(item => item.indicator !== 'glucose'), at, 'transit', 'glucose', 40, fastingVenous);
    const report = buildReport(assessment, { now: at, missionStart: '2026-10-04T00:00:00.000Z', environment: 'transit' }, [{ timestamp: at, text: 'Confirmed CMO contact' }]);

    expect(emergencyAssessment.result?.total).toBe(assessment.score.total);
    expect(emergencyAssessment.result?.classification).toBe(assessment.score.classification);
    expect(emergencyAssessment.plan?.steps).toEqual(assessment.plan.steps);
    expect(preview?.assessment.plan.steps).toEqual(assessment.plan.steps);
    expect(preview?.assessment.zones.immuneMetabolic.actions).toEqual(assessment.zones.immuneMetabolic.actions);
    expect(emergencyAssessment.alert?.zones.immuneMetabolic.actions).toEqual(assessment.zones.immuneMetabolic.actions);
    const action = assessment.zones.immuneMetabolic.actions[0];
    expect(report).toContain('ENGINE GUIDANCE (PROPOSED FOR MEDICAL REVIEW — NOT RECORDED CARE)');
    expect(report).toContain(action.text);
    expect(report).toContain(action.sourceUrl);
    expect(report).toContain('glucose context: fasting / venousPlasma');
    expect(report).toContain('RECORDED ACTIONS');
    expect(report).toContain('Confirmed CMO contact');
    for (const step of assessment.plan.steps.filter(item => item.contactRole === 'medicalOfficer')) {
      expect(step.channel).toBe('onboard');
      expect(step.earliestReplyAt).toBeUndefined();
    }
  });

  it('keeps the seven NEWS2 rows and their result separate from auxiliary readings', () => {
    const withAux = emergency();
    const withoutAux = assessEmergencyReadings(subject, toEngineEnvironment(env), consoleEvidence(snapshot(vitals()).readings, snapshot(vitals()).latest), at, 'emg-2');
    expect(withAux.evidence).toHaveLength(7);
    expect(withoutAux.evidence).toHaveLength(7);
    expect(withAux.result?.total).toBe(withoutAux.result?.total);
    expect(withAux.result?.classification).toBe(withoutAux.result?.classification);
    expect(withoutAux.auxiliaryEvidence).toBeUndefined();
    expect(withAux.auxiliaryEvidence?.some(row => row.id === 'diastolicBloodPressure')).toBe(true);

    const noOxygen = assessEmergencyReadings(subject, toEngineEnvironment(env), consoleEvidence(
      { ...snapshot(vitals()).readings, oxygen: null },
      { ...snapshot(vitals()).latest, oxygen: undefined },
    ), at, 'emg-3');
    expect(noOxygen.input.onSupplementalOxygen).toBe(false);
    expect(noOxygen.result).toBeNull();
    expect(noOxygen.plan).toBeNull();
  });

  it('keeps old records valid and preserves the old signature when there is no auxiliary data', () => {
    const snap = snapshot(vitals());
    const old = assessEmergencyReadings(subject, toEngineEnvironment(env), consoleEvidence(snap.readings, snap.latest), at, 'old');
    expect(isEmergencyAssessment(old)).toBe(true);
    expect(old.signature).toBe(evidenceSignature(old.evidence));
    const session = beginCase('collapse', 'unassigned', env, at, 'case-1');
    expect(session.assessments).toBeUndefined();
    const linked = attachAssessment(session, old);
    expect(attachAssessment(linked, { ...old, subject: { id: 'other', name: 'Other' } })).toBe(linked);
    expect(isEmergencySession(linked)).toBe(true);
  });

  it('captures glucose context and changes the signature when only the context changes', () => {
    const fasting = emergency(vitals(200, fastingVenous));
    const random = emergency(vitals(200, randomCapillary));
    expect(fasting.glucoseContext).toEqual(fastingVenous);
    expect(fasting.signature).not.toBe(random.signature);
    expect(fasting.auxiliaryEvidence?.find(row => row.id === 'glucose')?.ctx).toEqual(fastingVenous);
    expect(isEmergencyAssessment(fasting)).toBe(true);
  });

  it('uses the captured glucose context in the report clinical lines', () => {
    const context = { now: at, missionStart: '2026-10-04T00:00:00.000Z', environment: 'transit' as const };
    const fasting = buildReport(dashboard(vitals(130, fastingVenous)), context);
    const random = buildReport(dashboard(vitals(130, randomCapillary)), context);
    expect(fasting).toContain('WATCH · Glucose');
    expect(fasting).toContain('Fasting venous plasma glucose 126-199 mg/dL: screening watch');
    expect(random).not.toContain('Fasting venous plasma glucose 126-199 mg/dL: screening watch');
    expect(fasting).toContain('glucose context: fasting / venousPlasma');
    expect(random).toContain('glucose context: random / capillary');
  });
});
