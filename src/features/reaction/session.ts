import { REACTION_TIME_RANGE_MS, scoreReactionTest, type ReactionTestResult } from '../../engine/reaction';

/** RF-05: a 60-second simple reaction test, in the style of a short psychomotor vigilance task. */
export const TEST_MS = 60_000;
/** Random wait before each signal, so the next one cannot be anticipated. */
export const MIN_DELAY_MS = 2_000;
export const MAX_DELAY_MS = 6_000;
/** No response by then counts as a lapse; it equals the engine's upper validity limit. */
export const LAPSE_MS = REACTION_TIME_RANGE_MS.max;

export type Trial =
  | { kind: 'response'; ms: number }
  | { kind: 'falseStart' }
  | { kind: 'lapse' };

export interface TestSummary extends ReactionTestResult {
  falseStarts: number;
  lapses: number;
  tooFast: number;
  trials: number;
}

export function nextDelay(random: number): number {
  return MIN_DELAY_MS + Math.min(1, Math.max(0, random)) * (MAX_DELAY_MS - MIN_DELAY_MS);
}

/**
 * The engine scores the trials (valid 100–5000 ms, everything else a failure); this keeps the
 * kinds of failure apart so the crew member sees why: a press before the signal, no press, or a
 * press under 100 ms, which is an anticipation rather than a reaction.
 */
export function summarize(trials: readonly Trial[]): TestSummary {
  const times = trials.map((t) => (t.kind === 'response' ? t.ms : t.kind === 'falseStart' ? 0 : LAPSE_MS + 1));
  const scored = scoreReactionTest(times);
  const responses = trials.filter((t): t is Extract<Trial, { kind: 'response' }> => t.kind === 'response');
  return {
    ...scored,
    falseStarts: trials.filter((t) => t.kind === 'falseStart').length,
    lapses: trials.filter((t) => t.kind === 'lapse').length,
    tooFast: responses.filter((t) => t.ms < REACTION_TIME_RANGE_MS.min).length,
    trials: trials.length,
  };
}
