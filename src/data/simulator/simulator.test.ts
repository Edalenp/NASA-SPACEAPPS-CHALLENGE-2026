import { describe, expect, it } from 'vitest'
import { validateValue } from '../ranges'
import {
  generateMission,
  getSimulatorCalibration,
  MISSION_DAYS,
  OSD575_SIMULATOR_CALIBRATION,
} from './simulator'

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

  it('RF-28: exposes formal OSD-575 calibration metadata for metabolic panel', () => {
    const calibration = getSimulatorCalibration()
    expect(calibration.studyId).toBe('OSD-575')
    expect(calibration.datasetId).toBe('osd575-cmp-v3')
    expect(calibration.doi).toBe('10.26030/mc5d-p710')
    expect(calibration.calibratedAnalytes).toContain('glucose')
    expect(calibration.sourceUrl).toContain('nasa-osdr.s3.us-west-2.amazonaws.com')
    expect(OSD575_SIMULATOR_CALIBRATION).toEqual(calibration)
  })

  it('RF-28: glucose baseline distribution aligns with OSD-575 pre-flight cohort data', () => {
    const glucoses = generateMission({ ...base, events: [] })
      .filter((m) => m.type === 'glucose')
      .map((m) => m.value)
    const mean = glucoses.reduce((sum, value) => sum + value, 0) / glucoses.length
    expect(mean).toBeGreaterThanOrEqual(88)
    expect(mean).toBeLessThanOrEqual(96)
    // All glucose readings stay well within physically valid ranges
    expect(glucoses.every((val) => val >= 50 && val <= 140)).toBe(true)
  })
})