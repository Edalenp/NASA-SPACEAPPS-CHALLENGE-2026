import { describe, expect, it } from 'vitest'
import { recommendSleep } from './sleep'

describe('recommendSleep', () => {
  it('does not recommend anything while already sleeping', () => {
    expect(recommendSleep(3, 600, 'sleep')).toEqual({ kind: 'none' })
  })

  it('does not recommend anything without a sleep deficit', () => {
    expect(recommendSleep(8, 600, 'rest')).toEqual({ kind: 'none' })
    expect(recommendSleep(7, 600, 'work')).toEqual({ kind: 'none' })
  })

  it('recommends a full sleep window with 4 or more minutes available', () => {
    expect(recommendSleep(6, 300, 'rest')).toEqual({ kind: 'fullSleep', targetHours: 7 })
    expect(recommendSleep(5, 240, 'rest')).toEqual({ kind: 'fullSleep', targetHours: 7 })
  })

  it('recommends a 90 minute nap with a short window', () => {
    expect(recommendSleep(6, 239, 'work')).toEqual({ kind: 'nap', minutes: 90 })
    expect(recommendSleep(6, 60, 'work')).toEqual({ kind: 'nap', minutes: 90 })
  })

  it('does not recommend anything without an available window', () => {
    expect(recommendSleep(6, 0, 'work')).toEqual({ kind: 'none' })
    expect(recommendSleep(4, -10, 'exercise')).toEqual({ kind: 'none' })
  })
})
