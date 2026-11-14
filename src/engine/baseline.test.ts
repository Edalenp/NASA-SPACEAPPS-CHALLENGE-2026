import { describe, expect, it } from 'vitest'
import { calculateBaseline, isOutsideBaseline } from './baseline'

const samples = [68, 69, 70, 71, 72, 70, 70]

describe('calculateBaseline', () => {
  it('returns null with fewer than 7 samples', () => {
    expect(calculateBaseline(samples.slice(0, 6))).toBeNull()
  })

  it('computes mean and limits with population sd over 7 samples', () => {
    const baseline = calculateBaseline(samples)
    expect(baseline).not.toBeNull()
    expect(baseline?.mean).toBeCloseTo(70, 5)
    expect(baseline?.sd).toBeCloseTo(Math.sqrt(10 / 7), 5)
    expect(baseline?.sampleCount).toBe(7)
    expect(baseline?.lower).toBeCloseTo(70 - 2 * Math.sqrt(10 / 7), 5)
    expect(baseline?.upper).toBeCloseTo(70 + 2 * Math.sqrt(10 / 7), 5)
  })

  it('is deterministic', () => {
    expect(JSON.stringify(calculateBaseline(samples))).toBe(JSON.stringify(calculateBaseline(samples)))
  })
})

describe('isOutsideBaseline', () => {
  const baseline = calculateBaseline(samples)

  it('flags values outside mean plus minus 2 sd', () => {
    expect(isOutsideBaseline(80, baseline!)).toBe(true)
    expect(isOutsideBaseline(60, baseline!)).toBe(true)
  })

  it('does not flag values inside the range even if clinically high', () => {
    expect(isOutsideBaseline(72, baseline!)).toBe(false)
  })
})
