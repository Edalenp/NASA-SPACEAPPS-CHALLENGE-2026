import { calculateNews2, type News2Input, type News2Result } from '../../engine/news2';
import { evaluateZones } from '../../engine/zones';
import { planEscalation, type ContactRole, type EscalationPlan } from '../../engine/escalation';
import type { Alert, Environment } from '../../engine/types';
import type { Baseline } from '../../engine/baseline';
import type { GlucoseContext, IndicatorType } from '../../engine/types';
import { GLUCOSE_SPECIMENS, GLUCOSE_TIMINGS, normalizeGlucoseContext, sameGlucoseContext } from '../../engine/glucoseContext';
import { PHYSICAL_RANGES, validateValue } from '../../data/ranges';
import type { IndicatorId, ReadingValue } from '../../data/indicators';
import { indicatorTypes } from '../../data/indicator-contract';

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

/** A non-NEWS2 reading kept apart from the seven-observation NEWS2 evidence. */
export interface AuxiliaryReadingEvidence {
  id: IndicatorType;
  label: string;
  value: number;
  unit: string;
  source: 'manual' | 'simulator' | 'legacy';
  recordedAt: string;
  ctx?: GlucoseContext;
}

export interface EmergencyAssessmentOptions {
  auxiliaryEvidence?: AuxiliaryReadingEvidence[];
  auxiliaryCurrentValues?: Partial<Record<IndicatorType, number>>;
  auxiliaryBaselines?: Partial<Record<IndicatorType, Baseline>>;
  glucoseContext?: GlucoseContext;
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
  /** Optional non-NEWS2 context, captured separately from the seven NEWS2 rows. */
  auxiliaryEvidence?: AuxiliaryReadingEvidence[];
  auxiliaryCurrentValues?: Partial<Record<IndicatorType, number>>;
  auxiliaryBaselines?: Partial<Record<IndicatorType, Baseline>>;
  glucoseContext?: GlucoseContext;
  signature: string;
}

type SelectedReading = { value: ReadingValue; timestamp: string; source: 'manual' | 'cameraExperimental' | 'reactionTest' | 'simulator' | 'legacy'; ctx?: GlucoseContext };
export type SelectedReadings = Partial<Record<IndicatorId, SelectedReading>>;
const numeric = [
  ['respiration', 'respiratoryRate'], ['spo2', 'oxygenSaturation'], ['systolic', 'systolicBloodPressure'],
  ['pulse', 'heartRate'], ['temperature', 'temperature'],
] as const;
const levels = ['alert', 'newConfusion', 'voice', 'pain', 'unresponsive'] as const;
const auxiliaryIndicators = [
  ['diastolic', 'diastolicBloodPressure'], ['glucose', 'glucose'], ['sleep', 'sleepHours'],
  ['mood', 'mood'], ['reaction', 'reactionTime'], ['calcium', 'calcium'],
  ['sodium', 'sodium'], ['potassium', 'potassium'],
] as const;
const AUXILIARY_TYPES = new Set<IndicatorType>(auxiliaryIndicators.map(([, type]) => type));
const KNOWN_INDICATOR_TYPES = new Set<IndicatorType>(
  Object.values(indicatorTypes).filter((type): type is IndicatorType => type !== undefined),
);
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const isGlucoseContext = (value: unknown): value is GlucoseContext => {
  if (!isPlainObject(value)) return false;
  return typeof value.timing === 'string' &&
    (GLUCOSE_TIMINGS as readonly string[]).includes(value.timing) &&
    typeof value.specimen === 'string' &&
    (GLUCOSE_SPECIMENS as readonly string[]).includes(value.specimen);
};
const environmentKinds: Record<string, Environment['kind']> = { station: 'spaceStation', transit: 'spacecraft', rover: 'rover', base: 'planetaryBase' };
export function toEngineEnvironment(environment: { id: string; name: string; communicationDelayMinutes: number }): Environment {
  const kind = environmentKinds[environment.id];
  if (!kind) throw new Error('Unknown emergency environment');
  return { ...environment, kind };
}

/** Consume X's selected current-day snapshot; never infer provenance from matching values. */
export function consoleEvidence(readings: Record<IndicatorId, ReadingValue | null>, latest: SelectedReadings): ReadingEvidence[] {
  function evidence(id: IndicatorId): Pick<ReadingEvidence, 'source' | 'recordedAt' | 'value'> {
    const value = readings[id];
    if (value === null) return { value: null, source: 'missing', recordedAt: null };
    const selected = latest[id];
    if (!selected || selected.value !== value || selected.source === 'legacy' || !Number.isFinite(Date.parse(selected.timestamp))) {
      return { value: null, source: 'invalid', recordedAt: null };
    }
    return { value, source: selected.source === 'simulator' ? 'simulator' : 'manual', recordedAt: selected.timestamp };
  }
  const rows: ReadingEvidence[] = numeric.map(([id, type]) => {
    const row = evidence(id);
    const valid = typeof row.value === 'number' && validateValue(type, row.value).ok;
    return { id: type, label: PHYSICAL_RANGES[type].label, unit: PHYSICAL_RANGES[type].unit, ...row,
      ...(!valid && row.source !== 'missing' ? { value: null, source: 'invalid' as const } : {}) };
  });
  const consciousness = evidence('consciousness');
  const validConsciousness = levels.some(level => level === consciousness.value);
  rows.push({ id: 'consciousness', label: 'Consciousness', unit: '', ...consciousness,
    ...(!validConsciousness && consciousness.source !== 'missing' ? { value: null, source: 'invalid' as const } : {}) });
  const oxygen = evidence('oxygen');
  const validOxygen = oxygen.value === 'air' || oxygen.value === 'oxygen';
  rows.push({ id: 'onSupplementalOxygen', label: 'Air / supplemental oxygen', unit: '', ...oxygen,
    ...(!validOxygen && oxygen.source !== 'missing' ? { value: null, source: 'invalid' as const } : {}) });
  return rows;
}

export const evidenceSignature = (evidence: ReadingEvidence[], auxiliary: EmergencyAssessmentOptions = {}) => {
  const auxiliaryEvidence = auxiliary.auxiliaryEvidence ?? [];
  const currentValues = auxiliary.auxiliaryCurrentValues ?? auxiliaryCurrentValues(auxiliaryEvidence);
  const baselines = auxiliary.auxiliaryBaselines ?? {};
  const hasAuxiliary = auxiliaryEvidence.length > 0 || Object.keys(currentValues).length > 0 ||
    Object.keys(baselines).length > 0 || auxiliary.glucoseContext !== undefined;
  if (!hasAuxiliary) return JSON.stringify(evidence);
  return JSON.stringify({
    evidence,
    auxiliary: {
      evidence: auxiliaryEvidence,
      currentValues,
      baselines,
      ...(auxiliary.glucoseContext === undefined ? {} : { glucoseContext: normalizeGlucoseContext(auxiliary.glucoseContext) }),
    },
  });
};

export function auxiliaryCurrentValues(evidence: AuxiliaryReadingEvidence[]): Partial<Record<IndicatorType, number>> {
  return Object.fromEntries(evidence.map((row) => [row.id, row.value]));
}

export function auxiliaryBaselinesFor(baselines: Partial<Record<IndicatorId, Baseline>>): Partial<Record<IndicatorType, Baseline>> {
  const out: Partial<Record<IndicatorType, Baseline>> = {};
  for (const [id, baseline] of Object.entries(baselines)) {
    const type = indicatorTypes[id as IndicatorId];
    if (type && baseline) out[type] = baseline;
  }
  return out;
}

/** Current non-NEWS2 readings with declared provenance; legacy numeric glucose/DBP keep their source. */
export function consoleAuxiliaryEvidence(readings: Record<IndicatorId, ReadingValue | null>, latest: SelectedReadings): AuxiliaryReadingEvidence[] {
  return auxiliaryIndicators.flatMap(([id, type]) => {
    const value = readings[id];
    const selected = latest[id];
    if (typeof value !== 'number' || !selected || selected.value !== value ||
      !Number.isFinite(Date.parse(selected.timestamp)) || !validateValue(type, value).ok) return [];
    const legacy = selected.source === 'legacy';
    if (legacy && type !== 'glucose' && type !== 'diastolicBloodPressure') return [];
    const source = legacy ? 'legacy' as const : selected.source === 'simulator' ? 'simulator' as const : 'manual' as const;
    return [{
      id: type,
      label: PHYSICAL_RANGES[type].label,
      value,
      unit: PHYSICAL_RANGES[type].unit,
      source,
      recordedAt: selected.timestamp,
      ...(type === 'glucose'
        ? legacy
          ? { ctx: normalizeGlucoseContext(undefined) }
          : selected.ctx ? { ctx: normalizeGlucoseContext(selected.ctx) } : {}
        : {}),
    }];
  });
}

/** No thresholds or contact delays here: delegate both calculations to the backend. */
export function assessEmergencyReadings(subject: EmergencyAssessment['subject'], environment: Environment, evidence: ReadingEvidence[], capturedAt: string, id: string = crypto.randomUUID(), options: EmergencyAssessmentOptions = {}): EmergencyAssessment {
  const get = (key: ReadingEvidence['id']) => evidence.find(row => row.id === key)?.value ?? null;
  const number = (key: ReadingEvidence['id']) => typeof get(key) === 'number' ? get(key) as number : null;
  const consciousness = levels.find(level => level === get('consciousness')) ?? null;
  const oxygen = get('onSupplementalOxygen');
  const input: News2Input = { respiratoryRate: number('respiratoryRate'), oxygenSaturation: number('oxygenSaturation'),
    heartRate: number('heartRate'), systolicBloodPressure: number('systolicBloodPressure'), temperature: number('temperature'),
    consciousness, onSupplementalOxygen: oxygen === 'oxygen' };
  // The backend boolean cannot express an unknown oxygen status. Do not silently assume cabin air.
  const result = oxygen === 'air' || oxygen === 'oxygen' ? calculateNews2(input) : null;
  const auxiliaryEvidence = options.auxiliaryEvidence ?? [];
  const auxiliaryValues = { ...auxiliaryCurrentValues(auxiliaryEvidence), ...(options.auxiliaryCurrentValues ?? {}) };
  const auxiliaryBaselines = options.auxiliaryBaselines ?? {};
  const rowContext = auxiliaryEvidence.find(row => row.id === 'glucose')?.ctx;
  const glucoseContext = options.glucoseContext !== undefined
    ? normalizeGlucoseContext(options.glucoseContext)
    : rowContext === undefined ? undefined : normalizeGlucoseContext(rowContext);
  const hasAuxiliary = auxiliaryEvidence.length > 0 || Object.keys(auxiliaryValues).length > 0 ||
    Object.keys(auxiliaryBaselines).length > 0 || glucoseContext !== undefined;
  const currentValues = {
    ...(input.heartRate === null ? {} : { heartRate: input.heartRate }),
    ...(input.systolicBloodPressure === null ? {} : { systolicBloodPressure: input.systolicBloodPressure }),
    ...(input.respiratoryRate === null ? {} : { respiratoryRate: input.respiratoryRate }),
    ...(input.oxygenSaturation === null ? {} : { oxygenSaturation: input.oxygenSaturation }),
    ...(input.temperature === null ? {} : { temperature: input.temperature }),
    ...auxiliaryValues,
  };
  const alert: Alert | null = result && consciousness ? {
    id, crewMemberId: subject.id, createdAt: capturedAt, news2Score: result.isComplete ? result.total : null,
    isComplete: result.isComplete, level: result.classification, consciousness,
    zones: evaluateZones({ news2: result, baselines: auxiliaryBaselines, currentValues, glucoseContext }),
  } : null;
  const auxiliary = hasAuxiliary ? {
    auxiliaryEvidence: auxiliaryEvidence.map(row => ({ ...row })),
    auxiliaryCurrentValues: auxiliaryValues,
    auxiliaryBaselines: { ...auxiliaryBaselines },
    ...(glucoseContext === undefined ? {} : { glucoseContext }),
  } : {};
  return { id, capturedAt, subject: { ...subject }, environment: { ...environment }, input, result, alert,
    plan: alert ? planEscalation(alert, environment, capturedAt) : null, evidence: evidence.map(row => ({ ...row })),
    ...auxiliary,
    signature: evidenceSignature(evidence, { auxiliaryEvidence, auxiliaryCurrentValues: auxiliaryValues, auxiliaryBaselines, glucoseContext }) };
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
  if (s.auxiliaryEvidence !== undefined) {
    if (!Array.isArray(s.auxiliaryEvidence)) return false;
    const seen = new Set<string>();
    for (const row of s.auxiliaryEvidence) {
      if (!row || typeof row.id !== 'string' || !AUXILIARY_TYPES.has(row.id) || seen.has(row.id) ||
        typeof row.label !== 'string' || typeof row.unit !== 'string' ||
        typeof row.value !== 'number' || !Number.isFinite(row.value) ||
        !['manual','simulator','legacy'].includes(row.source) ||
        !Number.isFinite(Date.parse(row.recordedAt)) || !validateValue(row.id, row.value).ok) return false;
      if (row.ctx !== undefined && !isGlucoseContext(row.ctx)) return false;
      seen.add(row.id);
    }
  }
  if (s.auxiliaryCurrentValues !== undefined) {
    if (!isPlainObject(s.auxiliaryCurrentValues)) return false;
    for (const [key, value] of Object.entries(s.auxiliaryCurrentValues)) {
      if (!KNOWN_INDICATOR_TYPES.has(key as IndicatorType) || typeof value !== 'number' || !Number.isFinite(value)) return false;
    }
    for (const row of s.auxiliaryEvidence ?? []) {
      const value = s.auxiliaryCurrentValues[row.id];
      if (value !== undefined && value !== row.value) return false;
    }
  }
  if (s.auxiliaryBaselines !== undefined) {
    if (!isPlainObject(s.auxiliaryBaselines)) return false;
    for (const [key, baseline] of Object.entries(s.auxiliaryBaselines)) {
      if (!KNOWN_INDICATOR_TYPES.has(key as IndicatorType) || !isPlainObject(baseline) ||
        typeof baseline.mean !== 'number' || !Number.isFinite(baseline.mean) ||
        typeof baseline.sd !== 'number' || !Number.isFinite(baseline.sd) ||
        typeof baseline.lower !== 'number' || !Number.isFinite(baseline.lower) ||
        typeof baseline.upper !== 'number' || !Number.isFinite(baseline.upper) ||
        typeof baseline.sampleCount !== 'number' || !Number.isFinite(baseline.sampleCount)) return false;
    }
  }
  if (s.glucoseContext !== undefined) {
    if (!isGlucoseContext(s.glucoseContext)) return false;
    const rowContext = s.auxiliaryEvidence?.find(row => row.id === 'glucose')?.ctx;
    if (rowContext !== undefined && !sameGlucoseContext(s.glucoseContext, rowContext)) return false;
  }
  if (s.result !== null && (!s.result || typeof s.result.isComplete !== 'boolean' || !Number.isFinite(s.result.total) || ![null,'low','singleRed','medium','high'].includes(s.result.classification))) return false;
  if (s.alert !== null && (!s.alert || s.alert.id !== s.id || s.alert.crewMemberId !== s.subject.id || typeof s.alert.isComplete !== 'boolean')) return false;
  if (s.plan !== null && (!s.plan || s.plan.alertId !== s.id || !Array.isArray(s.plan.steps) || !s.plan.steps.every(step => step && Object.hasOwn(contactNames, step.contactRole) && Number.isFinite(Date.parse(step.dueAt))))) return false;
  return true;
}
