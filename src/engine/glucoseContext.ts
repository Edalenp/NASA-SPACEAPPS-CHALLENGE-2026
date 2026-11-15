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
]

export const GLUCOSE_SPECIMENS: readonly GlucoseSpecimen[] = [
  'unknown',
  'capillary',
  'venousPlasma',
  'interstitial',
]

const UNKNOWN_TIMING: GlucoseTiming = 'unknown'
const UNKNOWN_SPECIMEN: GlucoseSpecimen = 'unknown'

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
    return { timing: record.timing, specimen: record.specimen }
  }
  return { timing: UNKNOWN_TIMING, specimen: UNKNOWN_SPECIMEN }
}

/** Both axes must match after normalization; unknown only matches unknown. */
export function sameGlucoseContext(a: unknown, b: unknown): boolean {
  const left = normalizeGlucoseContext(a)
  const right = normalizeGlucoseContext(b)
  return left.timing === right.timing && left.specimen === right.specimen
}

/** True only when timing and specimen are both explicitly known. */
export function isKnownGlucoseContext(value: unknown): boolean {
  const context = normalizeGlucoseContext(value)
  return context.timing !== 'unknown' && context.specimen !== 'unknown'
}

/** The only context that supports the fasting venous plasma screening watch. */
export function isFastingVenousPlasma(value: unknown): boolean {
  const context = normalizeGlucoseContext(value)
  return context.timing === 'fasting' && context.specimen === 'venousPlasma'
}
