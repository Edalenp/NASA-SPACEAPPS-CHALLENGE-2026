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

export const ASSUME_NO_SUPPLEMENTAL_OXYGEN = false

export const INDICATOR_TYPES = Object.keys(INDICATOR_ZONES) as IndicatorType[]

export interface AlertInputs {
  crewMemberId: string
  now: string
  latest: Partial<Record<IndicatorType, Measurement>>
  history: Partial<Record<IndicatorType, Measurement[]>>
  consciousness: ConsciousnessLevel | null
  onSupplementalOxygen?: boolean
}

export interface HealthSnapshot {
  alert: Alert
  news2: News2Result
  baselines: Partial<Record<IndicatorType, Baseline>>
}

export function buildAlert(inputs: AlertInputs): HealthSnapshot {
  const { crewMemberId, now, latest, history, consciousness } = inputs
  const onSupplementalOxygen = inputs.onSupplementalOxygen ?? ASSUME_NO_SUPPLEMENTAL_OXYGEN
  const valueOf = (type: IndicatorType): number | null => latest[type]?.value ?? null

  const news2 = calculateNews2({
    respiratoryRate: valueOf('respiratoryRate'),
    oxygenSaturation: valueOf('oxygenSaturation'),
    onSupplementalOxygen,
    systolicBloodPressure: valueOf('systolicBloodPressure'),
    heartRate: valueOf('heartRate'),
    temperature: valueOf('temperature'),
    consciousness,
  })

  const baselines: Partial<Record<IndicatorType, Baseline>> = {}
  const currentValues: Partial<Record<IndicatorType, number>> = {}
  for (const type of INDICATOR_TYPES) {
    const current = latest[type]
    if (!current) continue
    currentValues[type] = current.value
    const prior = (history[type] ?? [])
      .filter((m) => m.id !== current.id && m.measuredAt < current.measuredAt)
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