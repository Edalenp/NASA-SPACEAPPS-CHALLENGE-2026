export interface Baseline {
  mean: number
  sd: number
  lower: number
  upper: number
  sampleCount: number
}

export const MIN_BASELINE_SAMPLES = 7

export function calculateBaseline(values: number[]): Baseline | null {
  if (values.length < MIN_BASELINE_SAMPLES) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  const sd = Math.sqrt(variance)
  return {
    mean,
    sd,
    lower: mean - 2 * sd,
    upper: mean + 2 * sd,
    sampleCount: values.length,
  }
}

export function isOutsideBaseline(value: number, baseline: Baseline): boolean {
  return value < baseline.lower || value > baseline.upper
}
