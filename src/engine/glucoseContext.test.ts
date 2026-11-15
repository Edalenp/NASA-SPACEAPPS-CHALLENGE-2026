import { describe, expect, it } from 'vitest'
import {
  isFastingVenousPlasma,
  isKnownGlucoseContext,
  normalizeGlucoseContext,
  sameGlucoseContext,
} from './glucoseContext'

describe('normalizeGlucoseContext', () => {
  it('turns missing, partial and malformed input into unknown on read', () => {
    const unknown = { timing: 'unknown', specimen: 'unknown' }
    expect(normalizeGlucoseContext(undefined)).toEqual(unknown)
    expect(normalizeGlucoseContext(null)).toEqual(unknown)
    expect(normalizeGlucoseContext('fasting')).toEqual(unknown)
    expect(normalizeGlucoseContext({ timing: 'fasting' })).toEqual(unknown)
    expect(normalizeGlucoseContext({ specimen: 'venousPlasma' })).toEqual(unknown)
    expect(normalizeGlucoseContext({ timing: 'bogus', specimen: 42 })).toEqual(unknown)
  })

  it('preserves valid axes and does not mutate its input', () => {
    const input = { timing: 'random', specimen: 'capillary' }
    expect(normalizeGlucoseContext(input)).toEqual(input)
    expect(input).toEqual({ timing: 'random', specimen: 'capillary' })
  })
})

describe('sameGlucoseContext', () => {
  it('matches only after normalization, with unknown matching unknown', () => {
    expect(sameGlucoseContext(undefined, { timing: 'unknown', specimen: 'unknown' })).toBe(true)
    expect(
      sameGlucoseContext(
        { timing: 'fasting', specimen: 'venousPlasma' },
        { timing: 'fasting', specimen: 'venousPlasma' },
      ),
    ).toBe(true)
    expect(
      sameGlucoseContext(
        { timing: 'fasting', specimen: 'venousPlasma' },
        { timing: 'fasting', specimen: 'capillary' },
      ),
    ).toBe(false)
    expect(
      sameGlucoseContext(
        { timing: 'random', specimen: 'capillary' },
        { timing: 'fasting', specimen: 'capillary' },
      ),
    ).toBe(false)
  })
})

describe('glucose context predicates', () => {
  it('requires both axes to be known before a context is usable', () => {
    expect(isKnownGlucoseContext({ timing: 'fasting', specimen: 'unknown' })).toBe(false)
    expect(isKnownGlucoseContext({ timing: 'fasting', specimen: 'venousPlasma' })).toBe(true)
  })

  it('reserves the fasting venous plasma gate for that exact tuple', () => {
    expect(isFastingVenousPlasma({ timing: 'fasting', specimen: 'venousPlasma', fastingHours: 8 })).toBe(true)
    expect(isFastingVenousPlasma({ timing: 'fasting', specimen: 'venousPlasma' })).toBe(false)
    expect(isFastingVenousPlasma({ timing: 'fasting', specimen: 'capillary' })).toBe(false)
    expect(isFastingVenousPlasma({ timing: 'random', specimen: 'venousPlasma' })).toBe(false)
  })
})
