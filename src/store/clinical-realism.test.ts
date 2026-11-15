import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, db } from './db';
import { useMission } from './mission';
import { useHealthStore } from './healthStore';
import { buildReport } from '../features/measurements/report';
import { assessEmergencyReadings, consoleAuxiliaryEvidence, consoleEvidence, isEmergencyAssessment, toEngineEnvironment } from '../features/emergency/assessment';
import { attachAssessment, beginCase, emergencyReport } from '../features/emergency/workflow';

beforeEach(async () => { await clearAll(); useMission.setState({ busy: false }); await useMission.getState().hydrate(); });
describe('source-based clinical context through the real storage path', () => {
  it('preserves fasting duration and classic symptoms through save, reload, emergency and both reports', async () => {
    const ctx = { timing: 'random', specimen: 'venousPlasma', symptoms: 'classic' } as const;
    await useMission.getState().record('glucose', 200, { ctx });
    await useMission.getState().hydrate();
    const assessment = useHealthStore.getState().assessment;
    expect(assessment.glucoseReview?.laboratory.criterion).toBe('random-plasma-with-symptoms');
    expect(assessment.deviations.glucose.status).toBe('watch');
    expect(assessment.score.measured).toBe(0);
    const mission = useMission.getState();
    const report = buildReport(assessment, { now: mission.now, missionStart: mission.missionStart, environment: mission.environment });
    expect(report).toContain('classic symptoms: classic');
    expect(report).toContain('not a diagnosis');
    const env = { id: 'transit', name: 'Transit', communicationDelayMinutes: 11.7 };
    const captured = assessEmergencyReadings({ id: 'patient', name: 'Patient' }, toEngineEnvironment(env), consoleEvidence(assessment.readings, assessment.latest), mission.now, 'symptoms-capture', { auxiliaryEvidence: consoleAuxiliaryEvidence(assessment.readings, assessment.latest), glucoseContext: ctx });
    expect(isEmergencyAssessment(captured)).toBe(true);
    expect(isEmergencyAssessment({ ...captured, glucoseContext: { ...ctx, symptoms: 'none' } })).toBe(false);
    const session = attachAssessment(beginCase('collapse', 'patient', env, mission.now, 'symptoms-case'), captured);
    expect(emergencyReport(session)).toContain('classic symptoms: classic');
    expect(emergencyReport(session)).toContain('random-plasma-with-symptoms laboratory criterion');
    expect((await db.measurements.toArray())[0].glucoseContext).toEqual(ctx);
  });
  it('rejects invalid fasting metadata before any write and leaves a historical duration unknown', async () => {
    await expect(useMission.getState().record('glucose', 130, { ctx: { timing: 'fasting', specimen: 'venousPlasma', fastingHours: -8 } })).rejects.toThrow('Fasting duration');
    expect(await db.measurements.count()).toBe(0);
    await useMission.getState().record('glucose', 130, { ctx: { timing: 'fasting', specimen: 'venousPlasma' } });
    const result = useHealthStore.getState().assessment;
    expect(result.glucoseReview?.laboratory.criterion).toBe('none');
    expect(result.glucoseReview?.laboratory.message).toContain('Duration is missing');
    expect(result.latest.glucose?.ctx).not.toHaveProperty('fastingHours');
  });
});
