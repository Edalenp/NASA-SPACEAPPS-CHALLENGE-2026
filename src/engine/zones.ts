import { isOutsideBaseline, type Baseline } from './baseline'
import { clinicalSeverity } from './clinicalLimits'
import type { News2Result } from './news2'
import {
  HEALTH_ACTION_REVIEW_MATRIX,
  HEALTH_ACTION_SOURCES,
  type HealthActionGroupId,
} from '../data/health-actions'
import {
  ZONE_IDS,
  type ActionTrigger,
  type IndicatorType,
  type SourcedAction,
  type ZoneEvaluation,
  type ZoneId,
  type ZoneState,
} from './types'

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

/** RF-18: the reviewed action group (data/health-actions.ts) behind each indicator. */
export const ACTION_GROUP_BY_INDICATOR: Partial<Record<IndicatorType, HealthActionGroupId>> = {
  heartRate: 'pulse',
  systolicBloodPressure: 'blood-pressure',
  diastolicBloodPressure: 'blood-pressure',
  respiratoryRate: 'respiration',
  oxygenSaturation: 'spo2',
  temperature: 'temperature',
  glucose: 'glucose',
  sleepHours: 'sleep',
  mood: 'mood',
}

const NEWS2_SOURCE = {
  title: 'Royal College of Physicians · NEWS2 (2017)',
  url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
}
const PVT_SOURCE = {
  title: 'Sleep · Response speed measurements on the psychomotor vigilance test (2021)',
  url: 'https://pubmed.ncbi.nlm.nih.gov/32556295/',
}

/**
 * Readings with no entry in the reviewed matrix still need a cited action when they are off.
 * Consciousness and supplemental oxygen are NEWS2 parameters; reaction time only ever deviates
 * from the personal range, because no citable absolute limit exists for it.
 */
const EXTRA_ACTIONS = {
  consciousness: {
    text: 'Treat any confusion or reduced response as new. Stay with the crew member and ask the onboard medical officer to assess them now.',
    ...NEWS2_SOURCE,
  },
  supplementalOxygen: {
    text: 'Keep the oxygen set as the onboard medical officer directed and ask them to review the oxygen saturation with you.',
    ...NEWS2_SOURCE,
  },
  reactionTime: {
    text: 'Repeat the reaction test after rest and note your sleep and workload. If it stays slower than usual, ask the onboard medical officer to review it.',
    ...PVT_SOURCE,
  },
} as const

const sourceById = new Map<string, { title: string; url: string }>(
  HEALTH_ACTION_SOURCES.map((source) => [source.id, source]),
)

function matrixAction(
  group: HealthActionGroupId,
  state: Exclude<ZoneState, 'normal'>,
  indicator: IndicatorType,
  trigger: ActionTrigger,
): SourcedAction {
  const review = HEALTH_ACTION_REVIEW_MATRIX[group][state]
  const source = sourceById.get(review.sourceIds[0])!
  // A change against the personal range is not a clinical finding; say so before the review step.
  const text = trigger === 'baseline' ? `Changed from your personal range. ${review.text}` : review.text
  return { text, sourceTitle: source.title, sourceUrl: source.url, indicator, trigger, state }
}

function extraAction(
  key: keyof typeof EXTRA_ACTIONS,
  state: Exclude<ZoneState, 'normal'>,
  trigger: ActionTrigger,
  indicator?: IndicatorType,
): SourcedAction {
  const action = EXTRA_ACTIONS[key]
  const text = trigger === 'baseline' ? `Changed from your personal range. ${action.text}` : action.text
  return { text, sourceTitle: action.title, sourceUrl: action.url, indicator, trigger, state }
}

export interface ZoneInput {
  news2: News2Result
  baselines: Partial<Record<IndicatorType, Baseline>>
  currentValues: Partial<Record<IndicatorType, number>>
}

interface IndicatorFinding {
  indicator: IndicatorType
  state: Exclude<ZoneState, 'normal'>
  trigger: ActionTrigger
}

/** The worst reason a single reading is off: a NEWS2 red or clinical alert, then the rest. */
function findingFor(indicator: IndicatorType, input: ZoneInput): IndicatorFinding | null {
  const param = NEWS2_PARAM_BY_INDICATOR[indicator]
  const score = param ? input.news2.scores[param] : null
  const value = input.currentValues[indicator]
  const clinical = value !== undefined ? clinicalSeverity(indicator, value) : null
  const baseline = input.baselines[indicator]
  const outside = baseline !== undefined && value !== undefined && isOutsideBaseline(value, baseline)
  if (score === 3) return { indicator, state: 'alert', trigger: 'news2' }
  if (clinical === 'alert') return { indicator, state: 'alert', trigger: 'clinical' }
  if (score !== null && score >= 1) return { indicator, state: 'attention', trigger: 'news2' }
  if (clinical === 'watch') return { indicator, state: 'attention', trigger: 'clinical' }
  if (outside) return { indicator, state: 'attention', trigger: 'baseline' }
  return null
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
    // Breathing supplemental oxygen scores 2 on NEWS2; it belongs to the lungs like SpO2.
    if (zoneId === 'lungs') scores.push(input.news2.scores.supplementalOxygen)
    const findings = indicators
      .map((indicator) => findingFor(indicator, input))
      .filter((finding): finding is IndicatorFinding => finding !== null)

    let state: ZoneState = 'normal'
    if (
      scores.includes(3) ||
      scores.filter((score) => score === 2).length >= 2 ||
      findings.some((finding) => finding.state === 'alert')
    ) {
      state = 'alert'
    } else if (scores.some((score) => score !== null && score >= 1) || findings.length > 0) {
      state = 'attention'
    }

    // RF-18: one cited action per abnormal reading, worst first; readings sharing a group share one.
    const actions: SourcedAction[] = []
    const seen = new Set<string>()
    const ordered = [...findings].sort((a, b) => (a.state === b.state ? 0 : a.state === 'alert' ? -1 : 1))
    for (const finding of ordered) {
      const group = ACTION_GROUP_BY_INDICATOR[finding.indicator]
      const key = group ?? finding.indicator
      if (seen.has(key)) continue
      seen.add(key)
      // Two NEWS2 2s make the zone red, so their review is written at the zone's level.
      const level = state === 'alert' && finding.trigger === 'news2' ? 'alert' : finding.state
      actions.push(
        group
          ? matrixAction(group, level, finding.indicator, finding.trigger)
          : extraAction('reactionTime', level, finding.trigger, finding.indicator),
      )
    }
    if (zoneId === 'head' && (input.news2.scores.consciousness ?? 0) > 0) {
      actions.unshift(extraAction('consciousness', 'alert', 'news2'))
    }
    if (zoneId === 'lungs' && input.news2.scores.supplementalOxygen > 0) {
      actions.push(extraAction('supplementalOxygen', state === 'alert' ? 'alert' : 'attention', 'news2'))
    }
    zones[zoneId] = { zoneId, state, indicators, actions }
  }
  return zones
}
