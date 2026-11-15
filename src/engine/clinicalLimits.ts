import table from './clinical-limits.json'
import type { IndicatorType } from './types'

export interface ClinicalRules {
  alertAbove?: number
  alertBelow?: number
  watchAbove?: number
  watchBelow?: number
}

export interface ClinicalLimit {
  unit: string
  source: string
  sourceUrl: string
  basis: string
  rules: ClinicalRules
  labels: Partial<Record<keyof ClinicalRules, string>>
}

export type ClinicalLimitsTable = Partial<Record<IndicatorType, ClinicalLimit>>

export const CLINICAL_LIMITS: ClinicalLimitsTable = table.limits

export const CLINICAL_LIMIT_SOURCES: { label: string; url: string }[] =
  table._meta.sources

export type ClinicalSeverity = 'alert' | 'watch'

export function clinicalSeverity(
  type: IndicatorType,
  value: number,
): ClinicalSeverity | null {
  const limit = CLINICAL_LIMITS[type]
  if (!limit || typeof value !== 'number' || !Number.isFinite(value)) return null
  const { rules } = limit
  if (
    (rules.alertAbove !== undefined && value > rules.alertAbove) ||
    (rules.alertBelow !== undefined && value < rules.alertBelow)
  ) {
    return 'alert'
  }
  if (
    (rules.watchAbove !== undefined && value > rules.watchAbove) ||
    (rules.watchBelow !== undefined && value < rules.watchBelow)
  ) {
    return 'watch'
  }
  return null
}

export function clinicalMessage(
  type: IndicatorType,
  value: number,
): string | null {
  const limit = CLINICAL_LIMITS[type]
  const severity = clinicalSeverity(type, value)
  if (!limit || !severity) return null
  const { rules } = limit
  const breached = (key: keyof ClinicalRules) =>
    rules[key] !== undefined &&
    (key === 'alertAbove' || key === 'watchAbove'
      ? value > (rules[key] as number)
      : value < (rules[key] as number))
  const ruleKey = (['alertAbove', 'alertBelow', 'watchAbove', 'watchBelow'] as const).find(breached)
  return (ruleKey && limit.labels[ruleKey]) ?? null
}
