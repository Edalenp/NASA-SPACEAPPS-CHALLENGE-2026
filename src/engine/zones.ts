import { isOutsideBaseline, type Baseline } from './baseline'
import { clinicalSeverity } from './clinicalLimits'
import type { News2Result } from './news2'
import {
  ZONE_IDS,
  type IndicatorType,
  type SourcedAction,
  type ZoneEvaluation,
  type ZoneId,
  type ZoneState,
} from './types'
import {
  HEALTH_ACTION_REVIEW_MATRIX,
  HEALTH_ACTION_SOURCES,
  type HealthActionGroupId,
  type HealthActionState,
} from '../data/health-actions'

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

export const INDICATOR_TO_ACTION_GROUP: Partial<Record<IndicatorType, HealthActionGroupId>> = {
  heartRate: 'pulse',
  systolicBloodPressure: 'blood-pressure',
  diastolicBloodPressure: 'blood-pressure',
  respiratoryRate: 'respiration',
  oxygenSaturation: 'spo2',
  temperature: 'temperature',
  glucose: 'glucose',
  sleepHours: 'sleep',
  mood: 'mood',
  reactionTime: 'sleep',
}

const ZONE_DEFAULT_GROUPS: Record<ZoneId, HealthActionGroupId[]> = {
  head: [],
  heartCirculation: ['blood-pressure', 'pulse'],
  lungs: ['respiration', 'spo2'],
  musculoskeletal: ['sleep'],
  immuneMetabolic: ['glucose', 'temperature'],
  sleepMood: ['sleep', 'mood'],
}

const HEAD_ACTION: Record<HealthActionState, SourcedAction> = {
  attention: {
    text: 'Record consciousness state and ask the onboard medical officer to review it with you.',
    sourceTitle: 'Royal College of Physicians · National Early Warning Score (NEWS) 2',
    sourceUrl: 'https://www.rcplondon.ac.uk/projects/outputs/national-early-warning-score-news-2',
  },
  alert: {
    text: 'Record consciousness state and any context, and notify the onboard medical officer immediately.',
    sourceTitle: 'Royal College of Physicians · National Early Warning Score (NEWS) 2',
    sourceUrl: 'https://www.rcplondon.ac.uk/projects/outputs/national-early-warning-score-news-2',
  },
}

export function getZoneActions(
  zoneId: ZoneId,
  state: ZoneState,
  indicators: readonly IndicatorType[] = [],
): SourcedAction[] {
  if (state === 'normal') return []
  const actionState: HealthActionState = state === 'alert' ? 'alert' : 'attention'

  if (zoneId === 'head') {
    return [HEAD_ACTION[actionState]]
  }

  const groupIds = new Set<HealthActionGroupId>()
  for (const ind of indicators) {
    const gid = INDICATOR_TO_ACTION_GROUP[ind]
    if (gid) groupIds.add(gid)
  }
  if (groupIds.size === 0) {
    for (const gid of ZONE_DEFAULT_GROUPS[zoneId] ?? []) {
      groupIds.add(gid)
    }
  }

  const actions: SourcedAction[] = []
  const seenUrls = new Set<string>()

  for (const gid of groupIds) {
    const group = HEALTH_ACTION_REVIEW_MATRIX[gid]
    if (!group) continue
    const review = group[actionState]
    if (!review) continue
    for (const sourceId of review.sourceIds) {
      const src = HEALTH_ACTION_SOURCES.find((s) => s.id === sourceId)
      if (src && !seenUrls.has(src.url)) {
        seenUrls.add(src.url)
        actions.push({
          text: review.text,
          sourceTitle: src.title,
          sourceUrl: src.url,
        })
      }
    }
  }

  return actions
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

    const abnormal = indicators.filter((ind) => {
      const param = NEWS2_PARAM_BY_INDICATOR[ind]
      const score = param !== undefined ? input.news2.scores[param] : null
      const baseline = input.baselines[ind]
      const value = input.currentValues[ind]
      const outside = baseline !== undefined && value !== undefined && isOutsideBaseline(value, baseline)
      const breach = value !== undefined ? clinicalSeverity(ind, value) : null
      return (score !== null && score > 0) || outside || breach === 'watch' || breach === 'alert'
    })

    const targetIndicators = abnormal.length > 0 ? abnormal : indicators
    const actions: SourcedAction[] = getZoneActions(zoneId, state, targetIndicators)

    zones[zoneId] = { zoneId, state, indicators, actions }
  }
  return zones
}
