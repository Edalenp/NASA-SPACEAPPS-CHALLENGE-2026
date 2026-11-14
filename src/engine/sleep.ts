import type { ActivityKind } from './types'

export type SleepRecommendation =
  | { kind: 'fullSleep'; targetHours: number }
  | { kind: 'nap'; minutes: number }
  | { kind: 'none' }

export const DAILY_SLEEP_TARGET_HOURS = 7
export const FULL_SLEEP_WINDOW_MINUTES = 240
export const NAP_MINUTES = 90

export function recommendSleep(
  sleepLast24hHours: number,
  minutesUntilNextTask: number,
  activity: ActivityKind,
): SleepRecommendation {
  if (activity === 'sleep') return { kind: 'none' }
  if (sleepLast24hHours >= DAILY_SLEEP_TARGET_HOURS) return { kind: 'none' }
  if (minutesUntilNextTask >= FULL_SLEEP_WINDOW_MINUTES) {
    return { kind: 'fullSleep', targetHours: DAILY_SLEEP_TARGET_HOURS }
  }
  if (minutesUntilNextTask > 0) return { kind: 'nap', minutes: NAP_MINUTES }
  return { kind: 'none' }
}
