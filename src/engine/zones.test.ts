import { describe, expect, it } from 'vitest'
import { calculateNews2, type News2Input } from './news2'
import { ZONE_IDS, type IndicatorType } from './types'
import { evaluateZones, INDICATOR_ZONES, type ZoneInput } from './zones'

const news2Input: News2Input = {
  respiratoryRate: 10,
  oxygenSaturation: 97,
  onSupplementalOxygen: false,
  systolicBloodPressure: 120,
  heartRate: 70,
  temperature: 37,
  consciousness: 'alert',
}

function zoneInput(overrides: Partial<ZoneInput> = {}): ZoneInput {
  return {
    news2: calculateNews2(news2Input),
    baselines: {},
    currentValues: {},
    ...overrides,
  }
}

describe('INDICATOR_ZONES map', () => {
  it('assigns every indicator type to exactly one zone', () => {
    const indicators: IndicatorType[] = [
      'systolicBloodPressure',
      'diastolicBloodPressure',
      'heartRate',
      'glucose',
      'temperature',
      'sleepHours',
      'mood',
      'respiratoryRate',
      'oxygenSaturation',
      'reactionTime',
    ]
    for (const indicator of indicators) {
      expect(ZONE_IDS).toContain(INDICATOR_ZONES[indicator])
    }
  })
})

describe('evaluateZones', () => {
  it('returns an evaluation for every zone id', () => {
    const zones = evaluateZones(zoneInput())
    expect(Object.keys(zones).sort()).toEqual([...ZONE_IDS].sort())
    for (const zoneId of ZONE_IDS) {
      expect(zones[zoneId].state).toBe('normal')
      expect(zones[zoneId].actions).toEqual([])
    }
  })

  it('alerts the lungs zone on a red respiratory rate', () => {
    const zones = evaluateZones(
      zoneInput({ news2: calculateNews2({ ...news2Input, respiratoryRate: 26 }) }),
    )
    expect(zones.lungs.state).toBe('alert')
    expect(zones.heartCirculation.state).toBe('normal')
  })

  it('alerts the heart zone with two score-2 parameters', () => {
    const zones = evaluateZones(
      zoneInput({
        news2: calculateNews2({
          ...news2Input,
          systolicBloodPressure: 95,
          heartRate: 120,
        }),
      }),
    )
    expect(zones.heartCirculation.state).toBe('alert')
  })

  it('sets attention on a single score-1 parameter', () => {
    const zones = evaluateZones(
      zoneInput({ news2: calculateNews2({ ...news2Input, heartRate: 100 }) }),
    )
    expect(zones.heartCirculation.state).toBe('attention')
  })

  it('alerts the head zone on altered consciousness', () => {
    const zones = evaluateZones(
      zoneInput({ news2: calculateNews2({ ...news2Input, consciousness: 'voice' }) }),
    )
    expect(zones.head.state).toBe('alert')
  })

  it('sets attention when a value is outside the personal baseline', () => {
    const zones = evaluateZones(
      zoneInput({
        baselines: {
          sleepHours: { mean: 7.5, sd: 0.5, lower: 6.5, upper: 8.5, sampleCount: 7 },
        },
        currentValues: { sleepHours: 4 },
      }),
    )
    expect(zones.sleepMood.state).toBe('attention')
  })

  it('stays normal when a value is inside the personal baseline', () => {
    const zones = evaluateZones(
      zoneInput({
        baselines: {
          sleepHours: { mean: 7.5, sd: 0.5, lower: 6.5, upper: 8.5, sampleCount: 7 },
        },
        currentValues: { sleepHours: 7.5 },
      }),
    )
    expect(zones.sleepMood.state).toBe('normal')
  })
})
