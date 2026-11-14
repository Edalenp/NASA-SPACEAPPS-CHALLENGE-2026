import type { IndicatorType, MeasurementUnit } from '../engine'

export interface PhysicalRange {
  label: string
  unit: MeasurementUnit
  min: number
  max: number
  decimals: number
}

export const PHYSICAL_RANGES: Record<IndicatorType, PhysicalRange> = {
  systolicBloodPressure: { label: 'Systolic blood pressure', unit: 'mmHg', min: 40, max: 300, decimals: 0 },
  diastolicBloodPressure: { label: 'Diastolic blood pressure', unit: 'mmHg', min: 20, max: 200, decimals: 0 },
  heartRate: { label: 'Heart rate', unit: 'bpm', min: 20, max: 300, decimals: 0 },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', min: 20, max: 1000, decimals: 0 },
  temperature: { label: 'Body temperature', unit: '°C', min: 25, max: 45, decimals: 1 },
  sleepHours: { label: 'Sleep', unit: 'h', min: 0, max: 24, decimals: 1 },
  mood: { label: 'Mood', unit: 'score', min: 1, max: 5, decimals: 0 },
  respiratoryRate: { label: 'Respiratory rate', unit: 'breaths/min', min: 2, max: 80, decimals: 0 },
  oxygenSaturation: { label: 'Oxygen saturation', unit: '%', min: 50, max: 100, decimals: 0 },
  reactionTime: { label: 'Reaction time', unit: 'ms', min: 100, max: 5000, decimals: 0 },
}

export type ValidationResult = { ok: true } | { ok: false; message: string }

const ok: ValidationResult = { ok: true }
const fail = (message: string): ValidationResult => ({ ok: false, message })

export function validateValue(type: IndicatorType, value: number): ValidationResult {
  const r = PHYSICAL_RANGES[type]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(`${r.label} must be a number.`)
  }
  if (value < r.min || value > r.max) {
    return fail(
      `${r.label} of ${value} ${r.unit} is not possible. Enter a value between ${r.min} and ${r.max} ${r.unit}.`,
    )
  }
  const factor = 10 ** r.decimals
  if (Math.abs(Math.round(value * factor) / factor - value) > 1e-9) {
    return fail(
      r.decimals === 0
        ? `${r.label} must be a whole number.`
        : `${r.label} accepts at most ${r.decimals} decimal place${r.decimals > 1 ? 's' : ''}.`,
    )
  }
  return ok
}

export function validateBloodPressurePair(systolic: number, diastolic: number): ValidationResult {
  const a = validateValue('systolicBloodPressure', systolic)
  if (!a.ok) return a
  const b = validateValue('diastolicBloodPressure', diastolic)
  if (!b.ok) return b
  if (diastolic >= systolic) {
    return fail('Diastolic pressure must be lower than systolic pressure.')
  }
  return ok
}

export const unitFor = (type: IndicatorType): MeasurementUnit => PHYSICAL_RANGES[type].unit