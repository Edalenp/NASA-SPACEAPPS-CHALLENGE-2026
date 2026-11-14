import { describe, expect, it } from 'vitest'
import { validateValue } from '../ranges'
import { generateMission, MISSION_DAYS } from './simulator'

const base = {
  seed: 2026,
  crewMemberId: 'crew-1',
  startDate: new Date('2026-11-14T00:00:00.000Z'),
}

describe('generateMission', () => {
  it('is deterministic: same seed, same data', () => {
    expect(generateMission(base)).toEqual(generateMission(base))
  })

  it('different seeds give different data', () => {
    expect(generateMission(base)).not.toEqual(generateMission({ ...base, seed: 7 }))
  })

  it('produces one reading per indicator per day', () => {
    const data = generateMission(base)
    expect(data).toHaveLength(MISSION_DAYS * 10)
    expect(new Set(data.map((m) => m.id)).size).toBe(data.length)
  })

  it('every value passes physical validation', () => {
    for (const m of generateMission(base)) {
      expect(validateValue(m.type, m.value).ok).toBe(true)
    }
  })

  it('marks everything as simulator with a mission day and ISO time', () => {
    for (const m of generateMission(base)) {
      expect(m.source).toBe('simulator')
      expect(m.missionDay).toBeGreaterThanOrEqual(1)
      expect(new Date(m.measuredAt).toISOString()).toBe(m.measuredAt)
    }
  })

  it('keeps mood on the 1–5 scale around a 3.8 mean', () => {
    const moods = generateMission({ ...base, events: [] })
      .filter((m) => m.type === 'mood')
      .map((m) => m.value)
    const mean = moods.reduce((sum, value) => sum + value, 0) / moods.length
    expect(mean).toBeGreaterThan(3.5)
    expect(mean).toBeLessThan(4.1)
    expect(moods.every((value) => Number.isInteger(value) && value >= 1 && value <= 5)).toBe(true)
  })

  it('injected events shift values', () => {
    const data = generateMission(base)
    const avg = (from: number, to: number) => {
      const xs = data
        .filter((m) => m.type === 'sleepHours' && m.missionDay! >= from && m.missionDay! <= to)
        .map((m) => m.value)
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(avg(40, 46)).toBeLessThan(avg(10, 30) - 1)
  })
})