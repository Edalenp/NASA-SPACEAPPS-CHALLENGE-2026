import {
  calculateBaseline,
  calculateNews2,
  evaluateZones,
  INDICATOR_ZONES,
  type Alert,
  type Baseline,
  type ConsciousnessLevel,
  type IndicatorType,
  type Measurement,
  type News2Result,
} from '../engine'

export const INDICATOR_TYPES = Object.keys(INDICATOR_ZONES) as IndicatorType[]

export interface AlertInputs {
  crewMemberId: string
  now: string
  latest: Partial<Record<IndicatorType, Measurement>>
  history: Partial<Record<IndicatorType, Measurement[]>>
  consciousness: ConsciousnessLevel | null
  /**
   * `null`/omitted means oxygen support was not observed. It must not be
   * inferred as cabin air: NEWS2 is incomplete until the oxygen flag exists.
   */
  onSupplementalOxygen?: boolean | null
}

export interface HealthSnapshot {
  alert: Alert
  news2: News2Result
  baselines: Partial<Record<IndicatorType, Baseline>>
}

export function buildAlert(inputs: AlertInputs): HealthSnapshot {
  const { crewMemberId, now, latest, history, consciousness } = inputs
  const oxygenRecorded = typeof inputs.onSupplementalOxygen === 'boolean'
  const valueOf = (type: IndicatorType): number | null => latest[type]?.value ?? null

  const rawNews2 = calculateNews2({
    respiratoryRate: valueOf('respiratoryRate'),
    oxygenSaturation: valueOf('oxygenSaturation'),
    onSupplementalOxygen: inputs.onSupplementalOxygen === true,
    systolicBloodPressure: valueOf('systolicBloodPressure'),
    heartRate: valueOf('heartRate'),
    temperature: valueOf('temperature'),
    consciousness,
  })
  // An unrecorded oxygen flag makes the score incomplete even if every other
  // NEWS2 parameter is present. Do not invent cabin air.
  const news2: News2Result = oxygenRecorded
    ? rawNews2
    : { ...rawNews2, isComplete: false, classification: null }

  const baselines: Partial<Record<IndicatorType, Baseline>> = {}
  const currentValues: Partial<Record<IndicatorType, number>> = {}
  for (const type of INDICATOR_TYPES) {
    const current = latest[type]
    if (current) currentValues[type] = current.value
    // A baseline can be ready before today's reading is recorded.
    const prior = (history[type] ?? [])
      .filter((m) => !current || (m.id !== current.id && m.measuredAt < current.measuredAt))
      .map((m) => m.value)
    const baseline = calculateBaseline(prior)
    if (baseline) baselines[type] = baseline
  }

  const zones = evaluateZones({ news2, baselines, currentValues })

  const alert: Alert = {
    id: `alert-${crewMemberId}-${now}`,
    crewMemberId,
    createdAt: now,
    news2Score: news2.isComplete ? news2.total : null,
    isComplete: news2.isComplete,
    level: news2.classification,
    consciousness: consciousness ?? 'alert',
    zones,
  }

  return { alert, news2, baselines }
}