import { afterEach, describe, expect, it, vi } from 'vitest';
import * as escalation from '../../engine/escalation';
import { scenarioReadings } from '../../data/mission';
import { readingsAt, type RecordEntry } from '../measurements/adapter';
import { assessEmergencyReadings, consoleEvidence, isEmergencyAssessment, toEngineEnvironment, type SelectedReadings } from './assessment';
import { attachAssessment, beginCase, confirmContact, emergencyReport } from './workflow';
import { createEmergencyJournal, isEmergencySession } from './journal';

const at = '2026-11-14T15:00:00.000Z';
const subject = { id: 'JL-02', name: 'Jordan Lee' };
const env = { id: 'transit', name: 'Transit vehicle', communicationDelayMinutes: 11.7 };
const normal = { ...scenarioReadings, pulse: 70, systolic: 120, respiration: 15, temperature: 37 };
function selected(readings: typeof normal): SelectedReadings {
  return Object.fromEntries(Object.entries(readings).filter(([,value]) => value !== null).map(([id, value]) => [id, { value, timestamp: at, source: 'simulator' as const }]));
}
function assessment(changes = {}, environment = env, id = 'assessment-1', capturedAt = at) {
  return assessEmergencyReadings(subject, toEngineEnvironment(environment), consoleEvidence({ ...normal, ...changes }, selected({ ...normal, ...changes })), capturedAt, id);
}
afterEach(() => vi.restoreAllMocks());

describe('latest backend assessment bridge', () => {
  it('uses corrected respiration bands and the separate oxygen score', () => {
    const s = assessment({ respiration: 10, oxygen: 'oxygen' });
    expect(s.input.respiratoryRate).toBe(10);
    expect(s.result?.scores.respiratoryRate).toBe(1);
    expect(s.result?.scores.oxygenSaturation).toBe(0);
    expect(s.result?.scores.supplementalOxygen).toBe(2);
    expect(s.result?.total).toBe(3);
  });
  it.each([
    ['low', {}, []],
    ['singleRed', { pulse: 250 }, ['medicalOfficer']],
    ['medium', { pulse: 120, systolic: 95, respiration: 22 }, ['crewPartner', 'medicalOfficer']],
    ['high', { pulse: 135, systolic: 88, respiration: 28 }, ['medicalOfficer', 'missionControl']],
  ] as const)('renders %s from the backend with its exact contact list', (level, changes, roles) => {
    const s = assessment(changes);
    expect(s.result?.classification).toBe(level);
    expect(s.plan?.steps.map(step => step.contactRole)).toEqual(roles);
    expect(isEmergencyAssessment(s)).toBe(true);
  });
  it.each([
    [{ id: 'station', name: 'Station', communicationDelayMinutes: 0 }, '2026-11-14T15:05:00.000Z'],
    [env, '2026-11-14T15:05:00.000Z'],
    [{ id: 'base', name: 'Base', communicationDelayMinutes: 20 }, '2026-11-14T15:05:00.000Z'],
  ])('keeps the onboard deadline independent of the Earth link in $0.id', (environment, deadline) => {
    const s = assessment({ pulse: 135, systolic: 88, respiration: 28 }, environment);
    expect(s.plan?.steps[0].dueAt).toBe(deadline);
    expect(s.plan).toEqual(escalation.planEscalation(s.alert!, toEngineEnvironment(environment), at));
  });
  it('delegates scheduling and does not substitute a frontend timing rule', () => {
    const spy = vi.spyOn(escalation, 'planEscalation').mockReturnValueOnce({ alertId: 'assessment-1', steps: [{ contactRole: 'crewPartner', dueAt: '2026-11-14T15:47:13.345Z' }] });
    const s = assessment();
    expect(spy).toHaveBeenCalledOnce();
    expect(s.plan?.steps[0]).toEqual({ contactRole: 'crewPartner', dueAt: '2026-11-14T15:47:13.345Z' });
  });
  it('keeps missing numeric data incomplete rather than filling it with normal values', () => {
    const s = assessment({ pulse: null });
    expect(s.result?.isComplete).toBe(false);
    expect(s.result?.classification).toBeNull();
    expect(s.alert?.news2Score).toBeNull();
    expect(s.plan?.steps).toEqual([]);
  });
  it('does not assume air or alert consciousness when categorical data is absent', () => {
    const missingOxygen = assessment({ oxygen: null });
    expect(missingOxygen.result).toBeNull();
    expect(missingOxygen.plan).toBeNull();
    const missingConsciousness = assessment({ consciousness: null });
    expect(missingConsciousness.result?.isComplete).toBe(false);
    expect(missingConsciousness.alert).toBeNull();
    expect(missingConsciousness.plan).toBeNull();
  });
  it('uses latest backend physical validation, accepting pulse 280 and rejecting 400', () => {
    expect(assessment({ pulse: 280 }).input.heartRate).toBe(280);
    const bad = assessment({ pulse: 400 });
    expect(bad.input.heartRate).toBeNull();
    expect(bad.evidence.find(row => row.id === 'heartRate')?.source).toBe('invalid');
  });
  it('uses declared provenance and timestamps rather than matching a value', () => {
    const rows = consoleEvidence(normal, { ...selected(normal), pulse: { value: 70, timestamp: at, source: 'manual' } });
    expect(rows.find(row => row.id === 'heartRate')).toMatchObject({ source: 'manual', recordedAt: at });
    expect(rows.find(row => row.id === 'respiratoryRate')).toMatchObject({ source: 'simulator', recordedAt: at });
    const changed = consoleEvidence(normal, { pulse: { value: 90, timestamp: at, source: 'manual' } });
    expect(changed.find(row => row.id === 'heartRate')).toMatchObject({ source: 'invalid', value: null });
  });
  it('takes the same selected record as X when the simulator contains future and newer same-day values', () => {
    const entries: RecordEntry[] = [
      { indicator: 'pulse', value: 72, timestamp: '2026-11-14T09:00:00.000Z', source: 'manual', recordId: 'manual' },
      { indicator: 'pulse', value: 99, timestamp: '2026-11-14T10:00:00.000Z', source: 'simulator', recordId: 'sim-today' },
      { indicator: 'respiration', value: 16, timestamp: '2026-11-14T10:00:00.000Z', source: 'simulator', recordId: 'sim-respiration' },
      { indicator: 'pulse', value: 72, timestamp: '2026-12-14T10:00:00.000Z', source: 'simulator', recordId: 'sim-future' },
    ];
    const snapshot = readingsAt(entries, at);
    const rows = consoleEvidence(snapshot.readings, snapshot.latest);
    expect(rows.find(row => row.id === 'heartRate')).toMatchObject({ value: 72, source: 'manual', recordedAt: entries[0].timestamp });
    expect(rows.find(row => row.id === 'respiratoryRate')).toMatchObject({ source: 'simulator', recordedAt: entries[2].timestamp });
  });
  it('keeps previous-day values missing and cannot use an unexplained value', () => {
    const snapshot = readingsAt([{ indicator: 'pulse', value: 70, timestamp: '2026-11-13T09:00:00.000Z', source: 'manual', recordId: 'yesterday' }], at);
    expect(consoleEvidence(snapshot.readings, snapshot.latest).find(row => row.id === 'heartRate')).toMatchObject({ source: 'missing', value: null, recordedAt: null });
    expect(consoleEvidence(normal, {}).find(row => row.id === 'heartRate')).toMatchObject({ source: 'invalid', value: null });
  });

});

describe('patient-linked context, records and notifications', () => {
  it('starts without associating another person’s health data', () => {
    const s = beginCase('collapse', 'unassigned', env, at, 'case-1');
    expect(s.assessments).toBeUndefined();
    expect(s.execution.crewMemberId).toBe('unassigned');
    expect(isEmergencySession(s)).toBe(true);
  });
  it('records explicit patient association and preserves the current step/timer', () => {
    const s = beginCase('collapse', 'unassigned', env, at, 'case-1');
    const linked = attachAssessment(s, assessment());
    expect(linked.execution.crewMemberId).toBe(subject.id);
    expect(linked.visits).toEqual(s.visits);
    expect(linked.execution.startedAt).toBe(at);
    expect(isEmergencySession(linked)).toBe(true);
  });
  it('updates context by appending a snapshot without moving an earlier deadline', () => {
    const first = assessment({ pulse: 135, systolic: 88, respiration: 28 });
    const s = attachAssessment(beginCase('collapse', 'unassigned', env, at, 'case-1'), first);
    const next = assessment({ pulse: 135, systolic: 88, respiration: 28 }, env, 'assessment-2', '2026-11-14T15:10:00Z');
    const updated = attachAssessment(s, next);
    expect(updated.assessments).toHaveLength(2);
    expect(updated.assessments![0].plan).toEqual(first.plan);
    expect(updated.visits).toEqual(s.visits);
  });
  it('rejects silently changing a patient or environment on the existing case', () => {
    const s = attachAssessment(beginCase('collapse', 'unassigned', env, at, 'case-1'), assessment());
    expect(attachAssessment(s, { ...assessment({}, env, 'other'), subject: { id: 'different', name: 'Other' } })).toBe(s);
    expect(attachAssessment(s, assessment({}, { ...env, communicationDelayMinutes: 0 }, 'other'))).toBe(s);
  });
  it('records a notification without modifying the engine plan or completing a care step', () => {
    const s = attachAssessment(beginCase('collapse', 'unassigned', env, at, 'case-1'), assessment({ pulse: 135, systolic: 88, respiration: 28 }));
    const updated = confirmContact(s, 'medicalOfficer', '2026-11-14T15:00:10Z');
    expect(updated.notifications).toEqual([{ assessmentId: 'assessment-1', contactRole: 'medicalOfficer', confirmedAt: '2026-11-14T15:00:10Z' }]);
    expect(updated.assessments![0].plan).toEqual(s.assessments![0].plan);
    expect(updated.visits).toEqual(s.visits);
    expect(confirmContact(updated, 'medicalOfficer', '2026-11-14T15:00:20Z')).toBe(updated);
    expect(confirmContact(updated, 'crewPartner', '2026-11-14T15:00:20Z')).toBe(updated);
    expect(isEmergencySession(updated)).toBe(true);
  });
  it('restores context and notification confirmations without resetting deadlines', () => {
    const s = confirmContact(attachAssessment(beginCase('collapse', 'unassigned', env, at, 'case-1'), assessment({ pulse: 135, systolic: 88, respiration: 28 })), 'medicalOfficer', at);
    const values = new Map<string,string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    createEmergencyJournal(storage).save(s);
    expect(createEmergencyJournal(storage).getSnapshot().sessions[0]).toEqual(s);
    expect(emergencyReport(s)).toContain('Crew Medical Officer: 2026-11-14T15:05:00.000Z');
    expect(emergencyReport(s)).toContain('User confirmed notification: Crew Medical Officer');
    expect(emergencyReport(s)).toContain('LINKED READINGS: Jordan Lee');
  });
  it('keeps pre-escalation journals readable', () => {
    expect(isEmergencySession(beginCase('chest', 'JL-02', env, at))).toBe(true);
  });
  it('rejects malformed assessment metadata safely', () => {
    expect(isEmergencyAssessment(null)).toBe(false);
    const s = assessment();
    expect(isEmergencyAssessment({ ...s, subject: null })).toBe(false);
    expect(isEmergencyAssessment({ ...s, plan: { alertId: s.id, steps: [{ contactRole: 'invented', dueAt: at }] } })).toBe(false);
    expect(isEmergencyAssessment({ ...s, evidence: [null] })).toBe(false);
  });
});
