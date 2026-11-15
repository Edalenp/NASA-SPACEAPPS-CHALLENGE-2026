import { describe, expect, it } from 'vitest'
import { isValidReactionTime, scoreReactionTest } from './reaction'

describe('isValidReactionTime', () => {
  it('accepts whole milliseconds inside the physical range', () => {
    expect(isValidReactionTime(100)).toBe(true)
    expect(isValidReactionTime(280)).toBe(true)
    expect(isValidReactionTime(5000)).toBe(true)
  })

  it('accepts decimals inside the range', () => {
    expect(isValidReactionTime(250.5)).toBe(true)
    expect(isValidReactionTime(100.1)).toBe(true)
    expect(isValidReactionTime(4999.9)).toBe(true)
  })

  it('rejects values outside the range or non finite', () => {
    expect(isValidReactionTime(99)).toBe(false)
    expect(isValidReactionTime(99.9)).toBe(false)
    expect(isValidReactionTime(5001)).toBe(false)
    expect(isValidReactionTime(Number.NaN)).toBe(false)
    expect(isValidReactionTime(Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('scoreReactionTest', () => {
  it('returns the mean of valid trials and counts failures', () => {
    const result = scoreReactionTest([250, 4000, 5000, 50, 6000, 250.5])
    expect(result.validTrials).toBe(4)
    expect(result.failures).toBe(2)
    expect(result.meanMs).toBe((250 + 4000 + 5000 + 250.5) / 4)
  })

  it('returns all valid results with zero failures', () => {
    const result = scoreReactionTest([200, 300, 400])
    expect(result).toEqual({ meanMs: 300, validTrials: 3, failures: 0 })
  })

  it('returns null mean when no trial is valid', () => {
    expect(scoreReactionTest([])).toEqual({ meanMs: null, validTrials: 0, failures: 0 })
    expect(scoreReactionTest([10, 9000])).toEqual({ meanMs: null, validTrials: 0, failures: 2 })
  })

  it('honours a custom range', () => {
    const result = scoreReactionTest([80, 100], { min: 50, max: 200 })
    expect(result).toEqual({ meanMs: 90, validTrials: 2, failures: 0 })
  })
})
