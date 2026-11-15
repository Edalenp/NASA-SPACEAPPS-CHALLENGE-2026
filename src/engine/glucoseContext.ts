import type {
  GlucoseContext,
  GlucoseSpecimen,
  GlucoseTiming,
} from './types'

export const GLUCOSE_TIMINGS: readonly GlucoseTiming[] = [
  'unknown',
  'fasting',
  'afterMeal',
  'random',
  'ogtt2h',
]

export const GLUCOSE_SPECIMENS: readonly GlucoseSpecimen[] = [
  'unknown',
  'capillary',
  'venousPlasma',
  'interstitial',
]

const UNKNOWN_TIMING: GlucoseTiming = 'unknown'
const UNKNOWN_SPECIMEN: GlucoseSpecimen = 'unknown'

export function glucoseContextError(value: GlucoseContext): string | null {
  if (!isTiming(value.timing) || !isSpecimen(value.specimen)) return 'Choose a valid glucose timing and sample type.';
  if (value.fastingHours !== undefined && (!Number.isFinite(value.fastingHours) || value.fastingHours < 0 || value.fastingHours > 72)) return 'Fasting duration must be between 0 and 72 hours, or left unknown.';
  if (value.symptoms !== undefined && !['unknown', 'none', 'classic'].includes(value.symptoms)) return 'Choose a valid symptom context.';
  return null;
}

/** Captured symptoms/duration must agree exactly; baseline comparability is a separate policy. */
export function sameRecordedGlucoseContext(a: unknown, b: unknown): boolean {
  const left = normalizeGlucoseContext(a), right = normalizeGlucoseContext(b);
  return sameGlucoseContext(left, right) && left.fastingHours === right.fastingHours &&
    (left.symptoms ?? 'unknown') === (right.symptoms ?? 'unknown');
}

function isTiming(value: unknown): value is GlucoseTiming {
  return typeof value === 'string' && (GLUCOSE_TIMINGS as readonly string[]).includes(value)
}

function isSpecimen(value: unknown): value is GlucoseSpecimen {
  return typeof value === 'string' && (GLUCOSE_SPECIMENS as readonly string[]).includes(value)
}

/**
 * Copy-only normalization used when a stored or submitted context is read.
 * A missing, partial or malformed context becomes fully unknown; the stored record
 * is untouched and no fasting inference is made.
 */
export function normalizeGlucoseContext(value: unknown): GlucoseContext {
  const record =
    value !== null && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {}
  if (isTiming(record.timing) && isSpecimen(record.specimen)) {
    return {
      timing: record.timing, specimen: record.specimen,
      ...(typeof record.fastingHours === 'number' && Number.isFinite(record.fastingHours) && record.fastingHours >= 0 && record.fastingHours <= 72 ? { fastingHours: record.fastingHours } : {}),
      ...(['unknown', 'none', 'classic'].includes(String(record.symptoms)) ? { symptoms: record.symptoms as GlucoseContext['symptoms'] } : {}),
    }
  }
  return { timing: UNKNOWN_TIMING, specimen: UNKNOWN_SPECIMEN }
}

/** Both axes must match after normalization; unknown only matches unknown. */
export function sameGlucoseContext(a: unknown, b: unknown): boolean {
  const left = normalizeGlucoseContext(a)
  const right = normalizeGlucoseContext(b)
  const fastingGroup = (ctx: GlucoseContext) => ctx.fastingHours === undefined ? 'unknown' : ctx.fastingHours >= 8 ? 'qualified' : 'short';
  return left.timing === right.timing && left.specimen === right.specimen &&
    (left.timing !== 'fasting' || fastingGroup(left) === fastingGroup(right))
}

/** True only when timing and specimen are both explicitly known. */
export function isKnownGlucoseContext(value: unknown): boolean {
  const context = normalizeGlucoseContext(value)
  return context.timing !== 'unknown' && context.specimen !== 'unknown'
}

/** The only context that supports the fasting venous plasma screening watch. */
export function isFastingVenousPlasma(value: unknown): boolean {
  const context = normalizeGlucoseContext(value)
  return context.timing === 'fasting' && context.specimen === 'venousPlasma' &&
    context.fastingHours !== undefined && context.fastingHours >= 8
}

export function glucoseContextLabel(value: unknown): string {
  const ctx = normalizeGlucoseContext(value);
  return `${ctx.timing} / ${ctx.specimen}; fasting hours: ${ctx.fastingHours ?? 'unknown'}; classic symptoms: ${ctx.symptoms ?? 'unknown'}`;
}
