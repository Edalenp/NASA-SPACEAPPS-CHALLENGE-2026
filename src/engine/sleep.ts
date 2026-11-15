import type { ActivityKind } from './types'

export type SleepNoneReason =
  | 'goal-met'
  | 'already-sleeping'
  | 'insufficient-window'
  | 'invalid-input'

export type SleepRecommendation =
  | { kind: 'fullSleep'; targetHours: number }
  | { kind: 'nap'; minutes: number }
  | { kind: 'none'; reason?: SleepNoneReason }

export const DAILY_SLEEP_TARGET_HOURS = 7
export const FULL_SLEEP_WINDOW_MINUTES = 240
export const NAP_MINUTES = 90

export function recommendSleep(
  sleepLast24hHours: number,
  minutesUntilNextTask: number,
  activity: ActivityKind,
): SleepRecommendation {
  const validHours = Number.isFinite(sleepLast24hHours) && sleepLast24hHours >= 0 && sleepLast24hHours <= 24
  const validWindow = Number.isFinite(minutesUntilNextTask) && minutesUntilNextTask >= 0
  if (!validHours || !validWindow) return { kind: 'none', reason: 'invalid-input' }
  if (activity === 'sleep') return { kind: 'none', reason: 'already-sleeping' }
  if (sleepLast24hHours >= DAILY_SLEEP_TARGET_HOURS) return { kind: 'none', reason: 'goal-met' }
  const remainingTargetMinutes = Math.max(
    0,
    (DAILY_SLEEP_TARGET_HOURS - sleepLast24hHours) * 60,
  )
  if (
    minutesUntilNextTask >= FULL_SLEEP_WINDOW_MINUTES &&
    minutesUntilNextTask >= remainingTargetMinutes
  ) {
    return { kind: 'fullSleep', targetHours: DAILY_SLEEP_TARGET_HOURS }
  }
  if (minutesUntilNextTask >= NAP_MINUTES) return { kind: 'nap', minutes: NAP_MINUTES }
  return { kind: 'none', reason: 'insufficient-window' }
}
