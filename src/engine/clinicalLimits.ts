import table from './clinical-limits.json'
import { sameGlucoseContext } from './glucoseContext'
import type { GlucoseContext, IndicatorType } from './types'
import { reviewGlucose } from './glucose'

export type ClinicalRuleKey =
  | 'alertAbove'
  | 'alertBelow'
  | 'watchAbove'
  | 'watchBelow'

export interface ClinicalRules {
  alertAbove?: number
  /** Per-rule inclusive upper bound; contextual glucose criteria are handled separately. */
  alertAboveInclusive?: boolean
  alertBelow?: number
  watchAbove?: number
  /** When present, watchAbove applies only to this normalized draw context. */
  watchAboveContext?: { timing: string; specimen: string }
  watchBelow?: number
}

export interface ClinicalLimit {
  unit: string
  source: string
  sourceUrl: string
  basis: string
  rules: ClinicalRules
  labels: Partial<Record<ClinicalRuleKey, string>>
}

export type ClinicalLimitsTable = Partial<Record<IndicatorType, ClinicalLimit>>

export const CLINICAL_LIMITS: ClinicalLimitsTable = table.limits

export const CLINICAL_LIMIT_SOURCES: { label: string; url: string }[] =
  table._meta.sources

export type ClinicalSeverity = 'alert' | 'watch'

export interface ClinicalMatch {
  rule: ClinicalRuleKey
  severity: ClinicalSeverity
}

const RULE_ORDER: readonly ClinicalRuleKey[] = [
  'alertAbove',
  'alertBelow',
  'watchAbove',
  'watchBelow',
]

const RULE_SEVERITY: Record<ClinicalRuleKey, ClinicalSeverity> = {
  alertAbove: 'alert',
  alertBelow: 'alert',
  watchAbove: 'watch',
  watchBelow: 'watch',
}

function upperBreached(value: number, bound: number, inclusive: boolean): boolean {
  return inclusive ? value >= bound : value > bound
}

function ruleBreached(
  rule: ClinicalRuleKey,
  value: number,
  rules: ClinicalRules,
): boolean {
  switch (rule) {
    case 'alertAbove': {
      const bound = rules.alertAbove
      return bound !== undefined && upperBreached(value, bound, rules.alertAboveInclusive === true)
    }
    case 'alertBelow': {
      const bound = rules.alertBelow
      return bound !== undefined && value < bound
    }
    case 'watchAbove': {
      const bound = rules.watchAbove
      return bound !== undefined && upperBreached(value, bound, false)
    }
    case 'watchBelow': {
      const bound = rules.watchBelow
      return bound !== undefined && value < bound
    }
  }
}

function contextAllows(
  rule: ClinicalRuleKey,
  context: GlucoseContext | undefined,
  rules: ClinicalRules,
): boolean {
  return (
    rule !== 'watchAbove' ||
    rules.watchAboveContext === undefined ||
    sameGlucoseContext(context, rules.watchAboveContext)
  )
}

/**
 * The single comparator for every absolute limit. Severity, message and citation are
 * derived from this match, so a boundary can never be alert in one place and watch in another.
 */
export function clinicalMatch(
  type: IndicatorType,
  value: number,
  context?: GlucoseContext,
): ClinicalMatch | null {
  const limit = CLINICAL_LIMITS[type]
  if (!limit || typeof value !== 'number' || !Number.isFinite(value)) return null
  if (type === 'glucose') {
    const severity = reviewGlucose(value, context).monitoring.severity
    return severity ? { rule: value < 54 ? 'alertBelow' : value < 70 ? 'watchBelow' : 'watchAbove', severity } : null
  }
  for (const rule of RULE_ORDER) {
    if (!contextAllows(rule, context, limit.rules)) continue
    if (ruleBreached(rule, value, limit.rules)) {
      return { rule, severity: RULE_SEVERITY[rule] }
    }
  }
  return null
}

export function clinicalSeverity(
  type: IndicatorType,
  value: number,
  context?: GlucoseContext,
): ClinicalSeverity | null {
  return clinicalMatch(type, value, context)?.severity ?? null
}

export function clinicalMessage(
  type: IndicatorType,
  value: number,
  context?: GlucoseContext,
): string | null {
  if (type === 'glucose') {
    const review = reviewGlucose(value, context)
    return review.monitoring.severity ? review.monitoring.message : null
  }
  const limit = CLINICAL_LIMITS[type]
  const match = clinicalMatch(type, value, context)
  if (!limit || !match) return null
  return limit.labels[match.rule] ?? null
}
