import type { IndicatorType, Measurement } from '../../engine'
import { PHYSICAL_RANGES } from '../ranges'
import { createRng } from './rng'

export const MISSION_DAYS = 180

export interface Profile {
  mean: number
  sd: number
  driftPerDay: number
  /** Lab panels are not daily: one reading every `everyDays` days, from a separate random stream. */
  everyDays?: number
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
  calcium: { mean: 9.6, sd: 0.25, driftPerDay: 0.002, everyDays: 7 },
  sodium: { mean: 140, sd: 1.5, driftPerDay: 0, everyDays: 7 },
  potassium: { mean: 4.1, sd: 0.25, driftPerDay: 0, everyDays: 7 },
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
  const labRng = createRng(seed ^ 0x5eed)
  const all = Object.keys(PROFILES) as IndicatorType[]
  const types = all.filter((type) => !PROFILES[type].everyDays)
  const labs = all.filter((type) => PROFILES[type].everyDays)
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
    for (const type of labs) {
      const p = PROFILES[type]
      if ((day - 1) % (p.everyDays ?? 1) !== 0) continue
      const raw = labRng.normal(p.mean + p.driftPerDay * day, p.sd)
      const minutes = 9 * 60 + labRng.int(0, 30)
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