import type { IndicatorType, Measurement } from '../../engine'
import { PHYSICAL_RANGES } from '../ranges'
import { createRng } from './rng'

export const MISSION_DAYS = 180

export interface SimulatorCalibration {
  readonly studyId: string
  readonly datasetId: string
  readonly doi: string
  readonly sourceUrl: string
  readonly calibratedAnalytes: readonly string[]
  readonly notes: string
}

/**
 * RF-28 / OSD-575 Calibration metadata.
 * Grounded in empirical observational data from the NASA Open Science Data Repository (OSDR).
 */
export const OSD575_SIMULATOR_CALIBRATION: SimulatorCalibration = {
  studyId: 'OSD-575',
  datasetId: 'osd575-cmp-v3',
  doi: '10.26030/mc5d-p710',
  sourceUrl:
    'https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv',
  calibratedAnalytes: ['glucose'],
  notes:
    'Baseline glucose profile (mean 90 mg/dL, sd 7 mg/dL) is calibrated against pre-flight observational samples from the NASA OSDR OSD-575 cohort (Inspiration4 Comprehensive Metabolic Panel, observed pre-flight cohort band 56–100 mg/dL).',
}

export function getSimulatorCalibration(): SimulatorCalibration {
  return OSD575_SIMULATOR_CALIBRATION
}

export interface Profile {
  mean: number
  sd: number
  driftPerDay: number
}

export const PROFILES: Record<IndicatorType, Profile> = {
  systolicBloodPressure: { mean: 118, sd: 6, driftPerDay: 0.02 },
  diastolicBloodPressure: { mean: 76, sd: 4, driftPerDay: 0.01 },
  heartRate: { mean: 68, sd: 4, driftPerDay: 0.02 },
  glucose: { mean: 90, sd: 7, driftPerDay: 0.03 },
  temperature: { mean: 36.7, sd: 0.2, driftPerDay: 0 },
  sleepHours: { mean: 7.2, sd: 0.6, driftPerDay: -0.004 },
  mood: { mean: 3.8, sd: 0.6, driftPerDay: -0.002 },
  respiratoryRate: { mean: 15, sd: 1.5, driftPerDay: 0 },
  oxygenSaturation: { mean: 97.5, sd: 0.8, driftPerDay: 0 },
  reactionTime: { mean: 280, sd: 25, driftPerDay: 0.3 },
}

export interface MissionEvent {
  name: string
  startDay: number
  endDay: number
  effects: Partial<Record<IndicatorType, number>>
}

export const DEFAULT_EVENTS: MissionEvent[] = [
  {
    name: 'sleep disruption',
    startDay: 40,
    endDay: 46,
    effects: { sleepHours: -2.5, mood: -1.2, reactionTime: 60, heartRate: 6 },
  },
  {
    name: 'solar particle event',
    startDay: 95,
    endDay: 98,
    effects: { heartRate: 12, temperature: 0.5, mood: -0.9, respiratoryRate: 3 },
  },
  {
    name: 'respiratory stress',
    startDay: 140,
    endDay: 144,
    effects: { respiratoryRate: 8, oxygenSaturation: -5, heartRate: 20 },
  },
]

export interface SimulatorOptions {
  seed: number
  crewMemberId: string
  startDate: Date
  days?: number
  events?: MissionEvent[]
}

const DAY_MS = 24 * 60 * 60 * 1000

const UNITS = Object.fromEntries(
  Object.entries(PHYSICAL_RANGES).map(([type, r]) => [type, r.unit]),
) as Record<IndicatorType, Measurement['unit']>

function clampAndRound(type: IndicatorType, value: number): number {
  const r = PHYSICAL_RANGES[type]
  const clamped = Math.min(r.max, Math.max(r.min, value))
  const factor = 10 ** r.decimals
  return Math.round(clamped * factor) / factor
}

export function generateMission(options: SimulatorOptions): Measurement[] {
  const {
    seed,
    crewMemberId,
    startDate,
    days = MISSION_DAYS,
    events = DEFAULT_EVENTS,
  } = options
  const rng = createRng(seed)
  const types = Object.keys(PROFILES) as IndicatorType[]
  const result: Measurement[] = []

  for (let day = 1; day <= days; day++) {
    const active = events.filter((e) => day >= e.startDay && day <= e.endDay)
    const dayStart = startDate.getTime() + (day - 1) * DAY_MS

    for (const type of types) {
      const p = PROFILES[type]
      const eventShift = active.reduce((sum, e) => sum + (e.effects[type] ?? 0), 0)
      const raw = rng.normal(p.mean + p.driftPerDay * day + eventShift, p.sd)
      const minutes = 8 * 60 + rng.int(0, 30)
      result.push({
        id: `sim-${crewMemberId}-${type}-d${day}`,
        crewMemberId,
        type,
        value: clampAndRound(type, raw),
        unit: UNITS[type],
        measuredAt: new Date(dayStart + minutes * 60 * 1000).toISOString(),
        source: 'simulator',
        missionDay: day,
      })
    }
  }
  return result
}