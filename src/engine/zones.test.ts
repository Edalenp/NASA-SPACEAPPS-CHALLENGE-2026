import { describe, expect, it } from 'vitest'
import { calculateNews2, type News2Input } from './news2'
import { ZONE_IDS, type IndicatorType } from './types'
import { evaluateZones, INDICATOR_ZONES, type ZoneInput } from './zones'

const news2Input: News2Input = {
  respiratoryRate: 15,
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

  it('alerts the heart zone on severe hypertension without any baseline', () => {
    const zones = evaluateZones(
      zoneInput({ currentValues: { systolicBloodPressure: 200 } }),
    )
    expect(zones.heartCirculation.state).toBe('alert')
  })

  it('alerts the heart zone on severe diastolic pressure, which NEWS2 does not score', () => {
    const zones = evaluateZones(
      zoneInput({ currentValues: { diastolicBloodPressure: 130 } }),
    )
    expect(zones.heartCirculation.state).toBe('alert')
  })

  it('sets attention on sleep below the NHLBI recommendation without a baseline', () => {
    const zones = evaluateZones(
      zoneInput({ currentValues: { sleepHours: 6.5 } }),
    )
    expect(zones.sleepMood.state).toBe('attention')
  })

  it('keeps a zone normal when the value breaches no clinical limit', () => {
    const zones = evaluateZones(
      zoneInput({ currentValues: { sleepHours: 8, glucose: 95 } }),
    )
    expect(zones.sleepMood.state).toBe('normal')
    expect(zones.immuneMetabolic.state).toBe('normal')
  })
})

describe('zone actions (RF-18)', () => {
  const abnormal = [
    ['red respiratory rate', { news2: calculateNews2({ ...news2Input, respiratoryRate: 26 }) }, 'lungs', 'news2'],
    ['clinical glucose alert with low NEWS2', { currentValues: { glucose: 40 } }, 'immuneMetabolic', 'clinical'],
    ['clinical blood pressure alert NEWS2 scores 0', { currentValues: { systolicBloodPressure: 200 } }, 'heartCirculation', 'clinical'],
    ['short sleep', { currentValues: { sleepHours: 5 } }, 'sleepMood', 'clinical'],
    [
      'mood outside the personal range',
      { baselines: { mood: { mean: 4, sd: 0.2, lower: 3.6, upper: 4.4, sampleCount: 7 } }, currentValues: { mood: 2 } },
      'sleepMood',
      'baseline',
    ],
    [
      'slower reaction than usual',
      { baselines: { reactionTime: { mean: 300, sd: 20, lower: 260, upper: 340, sampleCount: 7 } }, currentValues: { reactionTime: 420 } },
      'musculoskeletal',
      'baseline',
    ],
  ] as const

  it.each(abnormal)('gives a cited action for %s', (_, overrides, zoneId, trigger) => {
    const zones = evaluateZones(zoneInput(overrides as Partial<ZoneInput>))
    const zone = zones[zoneId]
    expect(zone.state).not.toBe('normal')
    expect(zone.actions.length).toBeGreaterThan(0)
    expect(zone.actions[0].trigger).toBe(trigger)
    for (const action of zone.actions) {
      expect(action.text.length).toBeGreaterThan(20)
      expect(action.sourceTitle.length).toBeGreaterThan(0)
      expect(new URL(action.sourceUrl).protocol).toBe('https:')
    }
  })

  it('marks a change from the personal range as such, not as a clinical finding', () => {
    const [, overrides] = abnormal[4]
    const action = evaluateZones(zoneInput(overrides as Partial<ZoneInput>)).sleepMood.actions[0]
    expect(action.text.startsWith('Changed from your personal range.')).toBe(true)
  })

  it('gives every abnormal zone an action and every normal zone none', () => {
    const zones = evaluateZones(
      zoneInput({
        news2: calculateNews2({ ...news2Input, consciousness: 'newConfusion', onSupplementalOxygen: true, heartRate: 120 }),
        currentValues: { heartRate: 120, glucose: 250, sleepHours: 4 },
      }),
    )
    for (const zoneId of ZONE_IDS) {
      if (zones[zoneId].state === 'normal') expect(zones[zoneId].actions, zoneId).toEqual([])
      else expect(zones[zoneId].actions.length, zoneId).toBeGreaterThan(0)
    }
    expect(zones.head.state).toBe('alert')
    expect(zones.head.actions[0].sourceTitle).toContain('NEWS2')
    expect(zones.lungs.state).toBe('attention')
  })

  it('shares one action between systolic and diastolic', () => {
    const zones = evaluateZones(zoneInput({ currentValues: { systolicBloodPressure: 190, diastolicBloodPressure: 125 } }))
    expect(zones.heartCirculation.actions).toHaveLength(1)
    expect(zones.heartCirculation.actions[0].state).toBe('alert')
  })
})

