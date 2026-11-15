import table from './news2-scoring.json'
import type { AlertLevel, ConsciousnessLevel } from './types'
import type { Consciousness, OxygenSupport, ReadingValue } from '../data/indicators'

const NEWS2_PARAMS = ['respiration', 'spo2', 'oxygen', 'systolic', 'pulse', 'consciousness', 'temperature'] as const
export type News2Param = (typeof NEWS2_PARAMS)[number]
export const news2Params: readonly News2Param[] = NEWS2_PARAMS

export interface News2Input {
  respiratoryRate: number | null
  oxygenSaturation: number | null
  onSupplementalOxygen: boolean
  systolicBloodPressure: number | null
  heartRate: number | null
  temperature: number | null
  consciousness: ConsciousnessLevel | null
}

export interface News2Scores {
  respiratoryRate: number | null
  oxygenSaturation: number | null
  supplementalOxygen: number
  systolicBloodPressure: number | null
  heartRate: number | null
  temperature: number | null
  consciousness: number | null
}

export interface News2Result {
  scores: News2Scores
  total: number
  isComplete: boolean
  classification: AlertLevel | null
}

interface Band { min?: number; max?: number; score: number }

const params = table.parameters

function band(bands: Band[], value: number): number {
  const hit = bands.find(
    (entry) =>
      (entry.min === undefined || value >= entry.min) &&
      (entry.max === undefined || value <= entry.max),
  )
  return hit?.score ?? 0
}

function scoreRespiratoryRate(value: number): number {
  return band(params.respirationRate, value)
}

function scoreOxygenSaturation(value: number): number {
  return band(params.spo2Scale1, value)
}

function scoreSystolicBloodPressure(value: number): number {
  return band(params.systolicBloodPressure, value)
}

function scoreHeartRate(value: number): number {
  return band(params.pulse, value)
}

function scoreTemperature(value: number): number {
  return band(params.temperature, Math.round(value * 10) / 10)
}

function scoreConsciousness(level: ConsciousnessLevel): number {
  return params.consciousness.find((entry) => entry.value === level)?.score ?? 3
}

function scoreSupplementalOxygen(onOxygen: boolean): number {
  const value = onOxygen ? 'oxygen' : 'air'
  return params.supplementalOxygen.find((entry) => entry.value === value)?.score ?? 0
}

/** Scores one parameter against the RCP chart; null when not measured. */
export function paramScore(id: News2Param, v: ReadingValue | null): number | null {
  if (v === null || v === undefined) return null
  switch (id) {
    case 'respiration': return band(params.respirationRate, v as number)
    case 'spo2': return band(params.spo2Scale1, v as number)
    case 'oxygen': return (v as OxygenSupport) === 'oxygen' ? 2 : 0
    case 'systolic': return band(params.systolicBloodPressure, v as number)
    case 'pulse': return band(params.pulse, v as number)
    case 'consciousness': return (v as Consciousness) === 'alert' ? 0 : 3
    case 'temperature': return band(params.temperature, Math.round((v as number) * 10) / 10)
  }
}

export type Escalation = 'self' | 'cmo' | 'surgeon'

function classify(total: number, scores: News2Scores): AlertLevel {
  const redCount = Object.values(scores).filter((score) => score === 3).length
  if (total >= 7) return 'high'
  if (total >= 5) return 'medium'
  if (redCount >= 1) return 'singleRed'
  return 'low'
}

export function calculateNews2(input: News2Input): News2Result {
  const scores: News2Scores = {
    respiratoryRate:
      input.respiratoryRate === null ? null : scoreRespiratoryRate(input.respiratoryRate),
    oxygenSaturation:
      input.oxygenSaturation === null ? null : scoreOxygenSaturation(input.oxygenSaturation),
    supplementalOxygen: scoreSupplementalOxygen(input.onSupplementalOxygen),
    systolicBloodPressure:
      input.systolicBloodPressure === null
        ? null
        : scoreSystolicBloodPressure(input.systolicBloodPressure),
    heartRate: input.heartRate === null ? null : scoreHeartRate(input.heartRate),
    temperature: input.temperature === null ? null : scoreTemperature(input.temperature),
    consciousness:
      input.consciousness === null ? null : scoreConsciousness(input.consciousness),
  }
  const isComplete = Object.values(scores).every((score) => score !== null)
  const total = Object.values(scores).reduce((sum, score) => sum + (score ?? 0), 0)
  const classification = isComplete ? classify(total, scores) : null
  return { scores, total, isComplete, classification }
}
