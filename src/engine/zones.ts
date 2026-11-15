import { isOutsideBaseline, type Baseline } from './baseline'
import { clinicalSeverity } from './clinicalLimits'
import type { News2Result } from './news2'
import { ZONE_IDS, type IndicatorType, type ZoneEvaluation, type ZoneId, type ZoneState } from './types'

export const INDICATOR_ZONES: Record<IndicatorType, ZoneId> = {
  heartRate: 'heartCirculation',
  systolicBloodPressure: 'heartCirculation',
  diastolicBloodPressure: 'heartCirculation',
  respiratoryRate: 'lungs',
  oxygenSaturation: 'lungs',
  glucose: 'immuneMetabolic',
  temperature: 'immuneMetabolic',
  sleepHours: 'sleepMood',
  mood: 'sleepMood',
  reactionTime: 'musculoskeletal',
}

const NEWS2_PARAM_BY_INDICATOR: Partial<Record<IndicatorType, keyof News2Result['scores']>> = {
  respiratoryRate: 'respiratoryRate',
  oxygenSaturation: 'oxygenSaturation',
  systolicBloodPressure: 'systolicBloodPressure',
  heartRate: 'heartRate',
  temperature: 'temperature',
}

export interface ZoneInput {
  news2: News2Result
  baselines: Partial<Record<IndicatorType, Baseline>>
  currentValues: Partial<Record<IndicatorType, number>>
}

export function evaluateZones(input: ZoneInput): Record<ZoneId, ZoneEvaluation> {
  const zones = {} as Record<ZoneId, ZoneEvaluation>
  for (const zoneId of ZONE_IDS) {
    const indicators = (Object.keys(INDICATOR_ZONES) as IndicatorType[]).filter(
      (indicator) => INDICATOR_ZONES[indicator] === zoneId,
    )
    const scores: (number | null)[] = []
    for (const indicator of indicators) {
      const param = NEWS2_PARAM_BY_INDICATOR[indicator]
      if (param !== undefined) scores.push(input.news2.scores[param])
    }
    if (zoneId === 'head') scores.push(input.news2.scores.consciousness)
    const outsideBaseline = indicators.some((indicator) => {
      const baseline = input.baselines[indicator]
      const value = input.currentValues[indicator]
      return baseline !== undefined && value !== undefined && isOutsideBaseline(value, baseline)
    })
    const clinicalBreaches = indicators.map((indicator) => {
      const value = input.currentValues[indicator]
      return value !== undefined ? clinicalSeverity(indicator, value) : null
    })
    let state: ZoneState = 'normal'
    if (
      scores.includes(3) ||
      scores.filter((score) => score === 2).length >= 2 ||
      clinicalBreaches.includes('alert')
    ) {
      state = 'alert'
    } else if (
      scores.some((score) => score !== null && score >= 1) ||
      outsideBaseline ||
      clinicalBreaches.includes('watch')
    ) {
      state = 'attention'
    }
    zones[zoneId] = { zoneId, state, indicators, actions: [] }
  }
  return zones
}
