import { describe, expect, it } from 'vitest'
import {
  PHYSICAL_RANGES,
  unitFor,
  validateBloodPressurePair,
  validateValue,
} from './ranges'

describe('validateValue', () => {
  it('rejects an impossible heart rate with a message explaining the range', () => {
    const r = validateValue('heartRate', 400)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('between 20 and 300 bpm')
  })

  it('accepts severe but possible values', () => {
    expect(validateValue('heartRate', 150).ok).toBe(true)
    expect(validateValue('oxygenSaturation', 85).ok).toBe(true)
    expect(validateValue('temperature', 40.5).ok).toBe(true)
  })

  it('accepts exact limits', () => {
    for (const [type, r] of Object.entries(PHYSICAL_RANGES)) {
      expect(validateValue(type as keyof typeof PHYSICAL_RANGES, r.min).ok).toBe(true)
      expect(validateValue(type as keyof typeof PHYSICAL_RANGES, r.max).ok).toBe(true)
    }
  })

  it('rejects NaN and Infinity', () => {
    expect(validateValue('glucose', NaN).ok).toBe(false)
    expect(validateValue('glucose', Infinity).ok).toBe(false)
  })

  it('requires integers where needed and limits decimals', () => {
    expect(validateValue('heartRate', 72.5).ok).toBe(false)
    expect(validateValue('temperature', 36.6).ok).toBe(true)
    expect(validateValue('temperature', 36.65).ok).toBe(false)
  })

  it('rejects saturation above 100 and sleep above 24 h', () => {
    expect(validateValue('oxygenSaturation', 101).ok).toBe(false)
    expect(validateValue('sleepHours', 25).ok).toBe(false)
  })
})

describe('validateBloodPressurePair', () => {
  it('accepts a coherent pair', () => {
    expect(validateBloodPressurePair(120, 80).ok).toBe(true)
  })

  it('rejects diastolic greater than or equal to systolic', () => {
    expect(validateBloodPressurePair(80, 120).ok).toBe(false)
    expect(validateBloodPressurePair(100, 100).ok).toBe(false)
  })
})

describe('unitFor', () => {
  it('returns the contract unit', () => {
    expect(unitFor('heartRate')).toBe('bpm')
    expect(unitFor('temperature')).toBe('°C')
  })
})