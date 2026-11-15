export interface ReactionRange {
  min: number
  max: number
}

export const REACTION_TIME_RANGE_MS: ReactionRange = { min: 100, max: 5000 }

export interface ReactionTestResult {
  meanMs: number | null
  validTrials: number
  failures: number
}

export function isValidReactionTime(
  ms: number,
  range: ReactionRange = REACTION_TIME_RANGE_MS,
): boolean {
  return Number.isFinite(ms) && ms >= range.min && ms <= range.max
}

export function scoreReactionTest(
  trials: readonly number[],
  range: ReactionRange = REACTION_TIME_RANGE_MS,
): ReactionTestResult {
  const valid = trials.filter((trial) => isValidReactionTime(trial, range))
  const meanMs =
    valid.length === 0 ? null : valid.reduce((sum, trial) => sum + trial, 0) / valid.length
  return { meanMs, validTrials: valid.length, failures: trials.length - valid.length }
}
