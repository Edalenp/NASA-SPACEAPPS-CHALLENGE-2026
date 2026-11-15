import { describe, expect, it } from 'vitest'
import { recommendSleep } from './sleep'

const none = (reason: string) => ({ kind: 'none', reason })

describe('recommendSleep', () => {
  it('keeps the existing explicit none states', () => {
    expect(recommendSleep(3, 600, 'sleep')).toEqual(none('already-sleeping'))
    expect(recommendSleep(8, 600, 'rest')).toEqual(none('goal-met'))
    expect(recommendSleep(7, 10, 'work')).toEqual(none('goal-met'))
    expect(recommendSleep(4, -10, 'exercise')).toEqual(none('invalid-input'))
    expect(recommendSleep(Number.NaN, 240, 'rest')).toEqual(none('invalid-input'))
  })

  it.each([
    [6, 10, 'work', none('insufficient-window')],
    [6, 60, 'work', none('insufficient-window')],
    [6, 89, 'work', none('insufficient-window')],
    [6, 90, 'work', { kind: 'nap', minutes: 90 }],
    [6, 239, 'work', { kind: 'nap', minutes: 90 }],
    [6, 240, 'work', { kind: 'fullSleep', targetHours: 7 }],
    [0.5, 250, 'rest', { kind: 'nap', minutes: 90 }],
    [0, 240, 'rest', { kind: 'nap', minutes: 90 }],
    [0, 419, 'rest', { kind: 'nap', minutes: 90 }],
    [0, 420, 'rest', { kind: 'fullSleep', targetHours: 7 }],
    [3, 240, 'rest', { kind: 'fullSleep', targetHours: 7 }],
    [7, 10, 'work', none('goal-met')],
    [6, 10, 'sleep', none('already-sleeping')],
  ] as const)('fits %s h of sleep into %s min for %s', (hours, minutes, activity, expected) => {
    expect(recommendSleep(hours, minutes, activity)).toEqual(expected)
  })

  it('treats zero sleep as valid and a zero window as insufficient', () => {
    expect(recommendSleep(0, 240, 'work')).toEqual({ kind: 'nap', minutes: 90 })
    expect(recommendSleep(0, 90, 'work')).toEqual({ kind: 'nap', minutes: 90 })
    expect(recommendSleep(0, 89, 'work')).toEqual(none('insufficient-window'))
    expect(recommendSleep(6, 0, 'work')).toEqual(none('insufficient-window'))
  })
})
