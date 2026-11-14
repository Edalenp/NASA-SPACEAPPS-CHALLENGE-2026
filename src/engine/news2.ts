import type { AlertLevel, ConsciousnessLevel } from './types'

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

function scoreRespiratoryRate(value: number): number {
  if (value <= 8) return 3
  if (value <= 11) return 0
  if (value <= 20) return 1
  if (value <= 24) return 2
  return 3
}

function scoreOxygenSaturation(value: number, onSupplementalOxygen: boolean): number {
  let score: number
  if (value <= 91) score = 3
  else if (value <= 93) score = 2
  else if (value <= 95) score = 1
  else score = 0
  return onSupplementalOxygen ? score + 2 : score
}

function scoreSystolicBloodPressure(value: number): number {
  if (value <= 90) return 3
  if (value <= 100) return 2
  if (value <= 110) return 1
  if (value <= 219) return 0
  return 3
}

function scoreHeartRate(value: number): number {
  if (value <= 40) return 3
  if (value <= 50) return 1
  if (value <= 90) return 0
  if (value <= 110) return 1
  if (value <= 130) return 2
  return 3
}

function scoreTemperature(value: number): number {
  if (value <= 35) return 3
  if (value <= 36) return 1
  if (value <= 38) return 0
  if (value <= 39) return 1
  return 2
}

function scoreConsciousness(level: ConsciousnessLevel): number {
  return level === 'alert' ? 0 : 3
}

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
      input.oxygenSaturation === null
        ? null
        : scoreOxygenSaturation(input.oxygenSaturation, input.onSupplementalOxygen),
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
