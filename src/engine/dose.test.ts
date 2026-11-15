import { describe, expect, it } from 'vitest'
import { aggregateDose, DOSE_LIMITS_MSV, doseStatus, DOSE_SOURCES } from './dose'

describe('aggregateDose', () => {
  it('sums daily doses', () => {
    expect(aggregateDose([1.2, 0.8, 2])).toBe(4)
  })

  it('returns zero without doses', () => {
    expect(aggregateDose([])).toBe(0)
  })
})

describe('doseStatus', () => {
  it('does not flag totals under both limits', () => {
    expect(doseStatus(249.9, 0)).toEqual({ careerExceeded: false, solarEventExceeded: false })
  })

  it('does not flag career under the limit when no solar event was exceeded', () => {
    expect(doseStatus(300, 0)).toEqual({ careerExceeded: false, solarEventExceeded: false })
  })

  it('marks the design-reference comparison at exactly 250 mSv within the event', () => {
    const status = doseStatus(100, 250)
    expect(status.solarEventExceeded).toBe(true)
    expect(status.careerExceeded).toBe(false)
  })

  it('flags the career limit at exactly 600 mSv', () => {
    const status = doseStatus(600, 0)
    expect(status.solarEventExceeded).toBe(false)
    expect(status.careerExceeded).toBe(true)
  })

  it('flags both when both are exceeded', () => {
    const status = doseStatus(650, 260)
    expect(status.careerExceeded).toBe(true)
    expect(status.solarEventExceeded).toBe(true)
  })

  it('accepts custom limits', () => {
    expect(doseStatus(100, 40, { careerMsv: 50, solarEventMsv: 150 })).toEqual({
      careerExceeded: true,
      solarEventExceeded: false,
    })
  })
})

describe('dose data', () => {
  it('declares the NASA-STD-3001 limits from the SRS', () => {
    expect(DOSE_LIMITS_MSV).toEqual({ careerMsv: 600, solarEventMsv: 250 })
  })

  it('carries cited sources for every limit', () => {
    expect(DOSE_SOURCES.length).toBeGreaterThan(0)
    for (const source of DOSE_SOURCES) {
      expect(source.sourceTitle).not.toBe('')
      expect(source.sourceUrl.startsWith('https://')).toBe(true)
    }
  })
})
