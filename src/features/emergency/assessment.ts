import { calculateNews2, type News2Input, type News2Result } from '../../engine/news2';
import { evaluateZones } from '../../engine/zones';
import { planEscalation, type ContactRole, type EscalationPlan } from '../../engine/escalation';
import type { Alert, Environment } from '../../engine/types';
import { PHYSICAL_RANGES, validateValue } from '../../data/ranges';
import type { IndicatorId, ReadingValue } from '../../data/indicators';

export const contactNames: Record<ContactRole, string> = {
  crewPartner: 'Crew partner', medicalOfficer: 'Crew Medical Officer', missionControl: 'Mission control',
};
export interface ReadingEvidence {
  id: keyof News2Input;
  label: string;
  value: number | string | null;
  unit: string;
  source: 'manual' | 'simulator' | 'missing' | 'invalid';
  recordedAt: string | null;
}
export interface EmergencyAssessment {
  id: string;
  capturedAt: string;
  subject: { id: string; name: string };
  environment: Environment;
  input: News2Input;
  result: News2Result | null;
  alert: Alert | null;
  plan: EscalationPlan | null;
  evidence: ReadingEvidence[];
  signature: string;
}

type ConsoleEntry = { indicator: IndicatorId; value: ReadingValue; timestamp: string };
const numeric = [
  ['respiration', 'respiratoryRate'], ['spo2', 'oxygenSaturation'], ['systolic', 'systolicBloodPressure'],
  ['pulse', 'heartRate'], ['temperature', 'temperature'],
] as const;
const levels = ['alert', 'newConfusion', 'voice', 'pain', 'unresponsive'] as const;
const environmentKinds: Record<string, Environment['kind']> = { station: 'spaceStation', transit: 'spacecraft', rover: 'rover', base: 'planetaryBase' };
export function toEngineEnvironment(environment: { id: string; name: string; communicationDelayMinutes: number }): Environment {
  const kind = environmentKinds[environment.id];
  if (!kind) throw new Error('Unknown emergency environment');
  return { ...environment, kind };
}

/** Compatibility bridge for X's current read API; units/ranges and scoring belong to latest backend. */
export function consoleEvidence(readings: Record<IndicatorId, ReadingValue | null>, entries: ConsoleEntry[]): ReadingEvidence[] {
  function provenance(id: IndicatorId, value: unknown): Pick<ReadingEvidence, 'source' | 'recordedAt'> {
    const latest = entries.findLast(entry => entry.indicator === id);
    const manual = Boolean(latest && latest.value === value);
    return { source: value === null ? 'missing' : manual ? 'manual' : 'simulator', recordedAt: manual ? latest?.timestamp ?? null : null };
  }
  const rows: ReadingEvidence[] = numeric.map(([id, type]) => {
    const raw = readings[id];
    const valid = typeof raw === 'number' && validateValue(type, raw).ok;
    return { id: type, label: PHYSICAL_RANGES[type].label, unit: PHYSICAL_RANGES[type].unit, value: valid ? raw : null,
      ...provenance(id, raw), ...(raw !== null && !valid ? { source: 'invalid' as const } : {}) };
  });
  const consciousness = readings.consciousness;
  const validConsciousness = levels.some(level => level === consciousness);
  rows.push({ id: 'consciousness', label: 'Consciousness', value: validConsciousness ? consciousness : null, unit: '',
    ...provenance('consciousness', consciousness), ...(consciousness !== null && !validConsciousness ? { source: 'invalid' as const } : {}) });
  const oxygen = readings.oxygen;
  const validOxygen = oxygen === 'air' || oxygen === 'oxygen';
  rows.push({ id: 'onSupplementalOxygen', label: 'Air / supplemental oxygen', value: validOxygen ? oxygen : null, unit: '',
    ...provenance('oxygen', oxygen), ...(oxygen !== null && !validOxygen ? { source: 'invalid' as const } : {}) });
  return rows;
}

export const evidenceSignature = (evidence: ReadingEvidence[]) => JSON.stringify(evidence);

/** No thresholds or contact delays here: delegate both calculations to the backend. */
export function assessEmergencyReadings(subject: EmergencyAssessment['subject'], environment: Environment, evidence: ReadingEvidence[], capturedAt: string, id: string = crypto.randomUUID()): EmergencyAssessment {
  const get = (key: ReadingEvidence['id']) => evidence.find(row => row.id === key)?.value ?? null;
  const number = (key: ReadingEvidence['id']) => typeof get(key) === 'number' ? get(key) as number : null;
  const consciousness = levels.find(level => level === get('consciousness')) ?? null;
  const oxygen = get('onSupplementalOxygen');
  const input: News2Input = { respiratoryRate: number('respiratoryRate'), oxygenSaturation: number('oxygenSaturation'),
    heartRate: number('heartRate'), systolicBloodPressure: number('systolicBloodPressure'), temperature: number('temperature'),
    consciousness, onSupplementalOxygen: oxygen === 'oxygen' };
  // The backend boolean cannot express an unknown oxygen status. Do not silently assume cabin air.
  const result = oxygen === 'air' || oxygen === 'oxygen' ? calculateNews2(input) : null;
  const alert: Alert | null = result && consciousness ? {
    id, crewMemberId: subject.id, createdAt: capturedAt, news2Score: result.isComplete ? result.total : null,
    isComplete: result.isComplete, level: result.classification, consciousness,
    zones: evaluateZones({ news2: result, baselines: {}, currentValues: {
      ...(input.heartRate === null ? {} : { heartRate: input.heartRate }),
      ...(input.systolicBloodPressure === null ? {} : { systolicBloodPressure: input.systolicBloodPressure }),
      ...(input.respiratoryRate === null ? {} : { respiratoryRate: input.respiratoryRate }),
      ...(input.oxygenSaturation === null ? {} : { oxygenSaturation: input.oxygenSaturation }),
      ...(input.temperature === null ? {} : { temperature: input.temperature }),
    } }),
  } : null;
  return { id, capturedAt, subject: { ...subject }, environment: { ...environment }, input, result, alert,
    plan: alert ? planEscalation(alert, environment, capturedAt) : null, evidence: evidence.map(row => ({ ...row })), signature: evidenceSignature(evidence) };
}

/** Validate persisted metadata without recalculating a historical score or changing a deadline. */
export function isEmergencyAssessment(value: unknown): value is EmergencyAssessment {
  if (!value || typeof value !== 'object') return false;
  const s = value as EmergencyAssessment;
  if (typeof s.id !== 'string' || !Number.isFinite(Date.parse(s.capturedAt)) || typeof s.subject?.id !== 'string' || typeof s.subject.name !== 'string') return false;
  if (!s.environment || !Object.values(environmentKinds).includes(s.environment.kind) || !Number.isFinite(s.environment.communicationDelayMinutes) || s.environment.communicationDelayMinutes < 0) return false;
  if (!s.input || typeof s.input.onSupplementalOxygen !== 'boolean' || !Array.isArray(s.evidence) || typeof s.signature !== 'string') return false;
  for (const row of s.evidence) {
    if (!row || typeof row.id !== 'string' || typeof row.label !== 'string' || typeof row.unit !== 'string' || !['manual','simulator','missing','invalid'].includes(row.source)) return false;
    if (row.value !== null && typeof row.value !== 'string' && (typeof row.value !== 'number' || !Number.isFinite(row.value))) return false;
    if (row.recordedAt !== null && !Number.isFinite(Date.parse(row.recordedAt))) return false;
  }
  if (s.result !== null && (!s.result || typeof s.result.isComplete !== 'boolean' || !Number.isFinite(s.result.total) || ![null,'low','singleRed','medium','high'].includes(s.result.classification))) return false;
  if (s.alert !== null && (!s.alert || s.alert.id !== s.id || s.alert.crewMemberId !== s.subject.id || typeof s.alert.isComplete !== 'boolean')) return false;
  if (s.plan !== null && (!s.plan || s.plan.alertId !== s.id || !Array.isArray(s.plan.steps) || !s.plan.steps.every(step => step && Object.hasOwn(contactNames, step.contactRole) && Number.isFinite(Date.parse(step.dueAt))))) return false;
  return true;
}
