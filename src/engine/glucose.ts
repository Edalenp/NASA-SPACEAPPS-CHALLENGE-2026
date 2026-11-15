import table from './clinical-limits.json';
import { isFastingVenousPlasma, normalizeGlucoseContext, sameGlucoseContext } from './glucoseContext';
import type { GlucoseContext } from './types';

export const ADA_DIAGNOSIS_SOURCE = 'https://doi.org/10.2337/dc26-S002';
export const ADA_MONITORING_SOURCE = 'https://doi.org/10.2337/dc26-S006';
export const GLUCOSE_LAB_CRITERIA = table.limits.glucose.contextualCriteria;

export interface GlucoseReview {
  monitoring: { severity: 'watch' | 'alert' | null; message: string };
  laboratory: { criterion: 'none' | 'fasting-plasma' | 'ogtt2h-plasma' | 'random-plasma-with-symptoms'; message: string };
  /** Arithmetic description only, never an ADA diagnostic test or a validated prediction. */
  trend?: { count: number; first: number; last: number; change: number; direction: 'rising' | 'falling' | 'unchanged' };
}

/** ADA thresholds are distinct from the app's watch/alert presentation and contact adaptation. */
export function reviewGlucose(value: number, context?: GlucoseContext): GlucoseReview {
  const ctx = normalizeGlucoseContext(context);
  const limits = table.limits.glucose;
  const criteria = limits.contextualCriteria;
  const laboratory: GlucoseReview['laboratory'] = { criterion: 'none', message: 'No diagnostic assessment: sample, timing and symptoms must be considered by a clinician. No automatic diagnosis.' };
  if (ctx.specimen === 'interstitial') laboratory.message = 'CGM sensor readings are for monitoring. ADA 2026 does not support CGM as an independent screening or diagnostic test.';
  else if (ctx.specimen === 'capillary') laboratory.message = 'Capillary meter reading: monitoring only; this is not a laboratory plasma diagnostic test.';
  else if (ctx.specimen === 'venousPlasma') {
    if (isFastingVenousPlasma(ctx) && value >= criteria.fastingPlasmaMgDl) laboratory.criterion = 'fasting-plasma';
    else if (ctx.timing === 'ogtt2h' && value >= criteria.ogtt2hPlasmaMgDl) laboratory.criterion = 'ogtt2h-plasma';
    else if (ctx.timing === 'random' && ctx.symptoms === 'classic' && value >= criteria.randomPlasmaMgDl) laboratory.criterion = 'random-plasma-with-symptoms';
    if (laboratory.criterion !== 'none') laboratory.message = `ADA 2026 ${laboratory.criterion} laboratory criterion reached. Clinician assessment is required; confirmatory testing is required unless a clinician establishes unequivocal hyperglycemia. This is not a diagnosis.`;
    else if (ctx.timing === 'fasting' && !isFastingVenousPlasma(ctx)) laboratory.message = 'Fasting laboratory criteria require at least 8 hours without caloric intake. Duration is missing or insufficient; do not infer it from the fasting label.';
    else if (ctx.timing === 'random' && value >= criteria.randomPlasmaMgDl) laboratory.message = 'Random laboratory plasma glucose at or above 200 mg/dL requires symptom context. The ADA random-glucose criterion requires classic symptoms or a clinician-assessed hyperglycemic crisis; an isolated value does not establish a diagnosis.';
    else if (ctx.timing === 'afterMeal') laboratory.message = 'An ordinary after-meal reading is not a standardized 2-hour 75-g OGTT; do not apply OGTT diagnostic criteria.';
  }
  let severity: GlucoseReview['monitoring']['severity'] = null;
  let message = 'Contextual glucose monitoring; absence of a flag does not establish normal glucose regulation.';
  if (value < limits.rules.alertBelow) {
    severity = 'alert'; message = 'ADA 2026 level 2 hypoglycemia range: below 54 mg/dL. App monitoring alert; not a diagnosis or a treatment protocol.';
  } else if (value < limits.rules.watchBelow) {
    severity = 'watch'; message = 'ADA 2026 level 1 hypoglycemia range: below 70 mg/dL and at least 54 mg/dL. Monitoring review required.';
  } else if (laboratory.criterion !== 'none') {
    severity = 'watch'; message = `ADA 2026 ${laboratory.criterion} laboratory criterion reached; clinician review and confirmation required. Not a diagnosis.`;
  } else if (isFastingVenousPlasma(ctx) && value >= criteria.impairedFastingLowerMgDl) {
    severity = 'watch'; message = 'ADA 2026 fasting plasma 100–125 mg/dL screening range. Requires clinician interpretation; not an automatic diagnosis.';
  } else if (ctx.symptoms === 'classic') {
    severity = 'watch'; message = 'Classic hyperglycemic symptoms reported. Request clinical assessment; this measurement alone cannot establish their cause.';
  }
  if (ctx.specimen === 'interstitial') message += ' Sensor result: consider device accuracy and confirm with an appropriate blood measurement when indicated; never use CGM alone to diagnose diabetes.';
  return { monitoring: { severity, message }, laboratory };
}

export function glucoseTrend(rows: readonly { value: number; ctx?: GlucoseContext; timestamp: string }[], context?: GlucoseContext): GlucoseReview['trend'] {
  const comparable = rows.filter(row => Number.isFinite(row.value) && sameGlucoseContext(row.ctx, context)).toSorted((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (comparable.length < 2) return undefined;
  const first = comparable[0].value, last = comparable.at(-1)!.value;
  return { count: comparable.length, first, last, change: last - first, direction: last > first ? 'rising' : last < first ? 'falling' : 'unchanged' };
}
